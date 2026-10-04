import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateUnpaidDue, hasQualifyingPaymentInMonth, isLastCalendarDayInNewYork, monthWindowInNewYork, parseReminderRecipients, TRACKING_START } from "../_shared/reminder-schedule.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-propertydesk-cron-secret",
};
const FROM_EMAIL = Deno.env.get("MAILERSEND_FROM_EMAIL") ?? "notifications@propertydesk.dynv6.net";
const FROM_NAME = "PropertyDesk";

type Account = {
  id: string;
  user_id: string;
  property_id: string;
  account_type: string;
  name: string;
  party_name: string | null;
  party_email: string | null;
  start_date: string;
  next_due_date: string | null;
  payment_amount: number | string;
  payment_frequency: string;
  status: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function reminderMessage(account: Account, property: { name: string; address: string; city: string | null; state: string | null; postal_code: string | null }, monthStart: string, monthEnd: string, amountDue: number) {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${monthStart}T00:00:00Z`));
  const address = [property.address, property.city, property.state, property.postal_code].filter(Boolean).join(", ");
  const subject = `Payment reminder for ${property.address} · ${label}`;
  const name = account.party_name?.trim() || "there";
  const sender = "PropertyDesk";
  const text = `Hello ${name},\n\nOur records show no rent or installment payment recorded for ${label}.\n\nUnpaid due as of ${monthEnd}: $${amountDue.toFixed(2)}\nProperty: ${address}\n\nIf you have already paid or believe this is incorrect, please contact your landlord or seller.\n\nThank you,\n${sender}`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Our records show no rent or installment payment recorded for ${escapeHtml(label)}.</p><p><strong>Unpaid due as of ${escapeHtml(monthEnd)}:</strong> $${amountDue.toFixed(2)}<br><strong>Property:</strong> ${escapeHtml(address)}</p><p>If you have already paid or believe this is incorrect, please contact your landlord or seller.</p><p>Thank you,<br>${sender}</p>`;
  return { subject, text, html };
}

async function claimLog(db: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const key = {
    account_id: row.account_id,
    reminder_month: row.reminder_month,
    recipient_email: row.recipient_email,
  };
  const { data: retry } = await db.from("pd_reminder_logs").update({
    status: "sending", reason: null, unpaid_due: row.unpaid_due, provider_message_id: null,
    attempted_at: new Date().toISOString(), completed_at: null,
  }).match(key).eq("status", "failed").select("id").maybeSingle();
  if (retry?.id) return retry.id as string;
  const { data, error } = await db.from("pd_reminder_logs").insert({ ...row, status: "sending" }).select("id").single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data.id as string;
}

async function saveResult(db: ReturnType<typeof createClient>, id: string, values: Record<string, unknown>) {
  const { error } = await db.from("pd_reminder_logs").update({ ...values, completed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  const expectedSecret = Deno.env.get("PD_REMINDER_CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-propertydesk-cron-secret") !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const now = new Date();
  if (!isLastCalendarDayInNewYork(now)) return Response.json({ ok: true, skipped: "not_last_day_of_month" }, { headers: corsHeaders });
  const { monthStart, monthEnd } = monthWindowInNewYork(now);
  const reminderMonth = monthStart;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mailerSendToken = Deno.env.get("MAILERSEND_API_TOKEN");
  if (!supabaseUrl || !serviceRoleKey || !mailerSendToken) {
    return Response.json({ error: "Reminder service is not configured" }, { status: 500, headers: corsHeaders });
  }
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: accounts, error: accountsError } = await db.from("pd_accounts")
    .select("id,user_id,property_id,account_type,name,party_name,party_email,start_date,next_due_date,payment_amount,payment_frequency,status")
    .eq("monthly_reminder_enabled", true).eq("status", "active");
  if (accountsError) return Response.json({ error: "Could not load enabled reminder accounts" }, { status: 500, headers: corsHeaders });
  const enabled = (accounts ?? []) as Account[];
  if (!enabled.length) return Response.json({ ok: true, month: reminderMonth, processed: 0 }, { headers: corsHeaders });

  const ids = enabled.map((account) => account.id);
  const propertyIds = [...new Set(enabled.map((account) => account.property_id))];
  const [paymentResult, propertyResult] = await Promise.all([
    db.from("pd_payments").select("account_id,amount,received_date,income_category,status")
      .in("account_id", ids).gte("received_date", TRACKING_START).lte("received_date", monthEnd).eq("status", "posted"),
    db.from("pd_properties").select("id,name,address,city,state,postal_code").in("id", propertyIds),
  ]);
  if (paymentResult.error || propertyResult.error) return Response.json({ error: "Could not load reminder records" }, { status: 500, headers: corsHeaders });
  const payments = paymentResult.data ?? [];
  const properties = new Map((propertyResult.data ?? []).map((property) => [property.id, property]));
  let accepted = 0, failed = 0, skipped = 0;

  for (const account of enabled) {
    const property = properties.get(account.property_id);
    if (!property) continue;
    const accountPayments = payments.filter((payment) => payment.account_id === account.id);
    const recipients = parseReminderRecipients(account.party_email);
    const due = calculateUnpaidDue(account, monthStart, monthEnd, accountPayments);
    const rows = recipients.length ? recipients : [null];
    for (const recipient of rows) {
      let reason: string | null = null;
      if (!recipient) reason = "missing_recipient_email";
      else if (hasQualifyingPaymentInMonth(accountPayments, monthStart, monthEnd)) reason = "payment_recorded_this_month";
      else if (due.total <= 0) reason = "no_unpaid_scheduled_amount";
      const logRow = {
        user_id: account.user_id, account_id: account.id, reminder_month: reminderMonth,
        recipient_email: recipient, reason, unpaid_due: due.total,
        status: reason ? "skipped" : "sending", attempted_at: new Date().toISOString(),
      };
      if (reason) {
        const { error } = await db.from("pd_reminder_logs").upsert(logRow, { onConflict: "account_id,reminder_month,recipient_key", ignoreDuplicates: true });
        if (error) failed++;
        else skipped++;
        continue;
      }
      const logId = await claimLog(db, logRow);
      if (!logId) continue;
      try {
        const message = reminderMessage(account, property, monthStart, monthEnd, due.total);
        const response = await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: { Authorization: `Bearer ${mailerSendToken}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            from: { email: FROM_EMAIL, name: FROM_NAME },
            to: [{ email: recipient }],
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
        });
        if (response.status === 202) {
          await saveResult(db, logId, { status: "accepted", reason: null, provider_message_id: response.headers.get("x-message-id") });
          accepted++;
        } else {
          await saveResult(db, logId, { status: "failed", reason: `mailersend_http_${response.status}` });
          failed++;
        }
      } catch {
        await saveResult(db, logId, { status: "failed", reason: "mailersend_request_failed" });
        failed++;
      }
    }
  }
  return Response.json({ ok: true, month: reminderMonth, accepted, failed, skipped }, { headers: corsHeaders });
});
