import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateUnpaidDue,
  hasQualifyingPaymentInMonth,
  isLastCalendarDayInNewYork,
  monthWindowInNewYork,
  parseReminderRecipients,
  TRACKING_START,
} from "../_shared/reminder-schedule.mjs";
import { reminderMessage } from "../_shared/reminder-message.mjs";
import { createReminderLogStore } from "../_shared/reminder-log.mjs";
import { sendReminderEmail } from "../_shared/mailersend.mjs";

const FROM_EMAIL =
  Deno.env.get("MAILERSEND_FROM_EMAIL") ??
  "notifications@propertydesk.dynv6.net";
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

Deno.serve(async (request) => {
  // This job is invoked by pg_cron, not by browser code. Do not expose a
  // wildcard CORS policy for an endpoint guarded by a server-side secret.
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  const expectedSecret = Deno.env.get("PD_REMINDER_CRON_SECRET");
  if (
    !expectedSecret ||
    request.headers.get("x-propertydesk-cron-secret") !== expectedSecret
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!isLastCalendarDayInNewYork(now))
    return Response.json({ ok: true, skipped: "not_last_day_of_month" });
  const { monthStart, monthEnd } = monthWindowInNewYork(now);
  const reminderMonth = monthStart;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mailerSendToken = Deno.env.get("MAILERSEND_API_TOKEN");
  if (!supabaseUrl || !serviceRoleKey || !mailerSendToken) {
    return Response.json(
      { error: "Reminder service is not configured" },
      { status: 500 },
    );
  }
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const reminderLog = createReminderLogStore(db);
  const { data: accounts, error: accountsError } = await db
    .from("pd_accounts")
    .select(
      "id,user_id,property_id,account_type,name,party_name,party_email,start_date,next_due_date,payment_amount,payment_frequency,status",
    )
    .eq("monthly_reminder_enabled", true)
    .eq("status", "active");
  if (accountsError)
    return Response.json(
      { error: "Could not load enabled reminder accounts" },
      { status: 500 },
    );
  const enabled = (accounts ?? []) as Account[];
  if (!enabled.length)
    return Response.json({ ok: true, month: reminderMonth, processed: 0 });

  const ids = enabled.map((account) => account.id);
  const propertyIds = [
    ...new Set(enabled.map((account) => account.property_id)),
  ];
  const [paymentResult, propertyResult] = await Promise.all([
    db
      .from("pd_payments")
      .select("account_id,amount,received_date,income_category,status")
      .in("account_id", ids)
      .gte("received_date", TRACKING_START)
      .lte("received_date", monthEnd)
      .eq("status", "posted"),
    db
      .from("pd_properties")
      .select("id,name,address,city,state,postal_code")
      .in("id", propertyIds),
  ]);
  if (paymentResult.error || propertyResult.error)
    return Response.json(
      { error: "Could not load reminder records" },
      { status: 500 },
    );
  const payments = paymentResult.data ?? [];
  const properties = new Map(
    (propertyResult.data ?? []).map((property) => [property.id, property]),
  );
  let accepted = 0,
    failed = 0,
    skipped = 0;

  for (const account of enabled) {
    const property = properties.get(account.property_id);
    if (!property) continue;
    const accountPayments = payments.filter(
      (payment) => payment.account_id === account.id,
    );
    const recipients = parseReminderRecipients(account.party_email).sort(
      (a, b) => a.localeCompare(b),
    );
    const due = calculateUnpaidDue(
      account,
      monthStart,
      monthEnd,
      accountPayments,
    );
    const rows = recipients.length
      ? recipients.map((recipient, index) => ({
          recipient,
          recipient_index: index + 1,
        }))
      : [{ recipient: null, recipient_index: 0 }];
    for (const { recipient, recipient_index } of rows) {
      let reason: string | null = null;
      if (!recipient) reason = "missing_recipient_email";
      else if (
        hasQualifyingPaymentInMonth(accountPayments, monthStart, monthEnd)
      )
        reason = "payment_recorded_this_month";
      else if (due.total <= 0) reason = "no_unpaid_scheduled_amount";
      const logRow = {
        user_id: account.user_id,
        account_id: account.id,
        reminder_month: reminderMonth,
        recipient_index,
        reason,
        unpaid_due: due.total,
        status: reason ? "skipped" : "sending",
        attempted_at: new Date().toISOString(),
      };
      if (reason) {
        try {
          await reminderLog.recordSkipped(logRow);
          skipped++;
        } catch {
          failed++;
        }
        continue;
      }
      const logId = await reminderLog.claim(logRow);
      if (!logId) continue;
      try {
        const message = reminderMessage(
          account,
          property,
          monthStart,
          monthEnd,
          due.total,
        );
        const response = await sendReminderEmail({
          token: mailerSendToken,
          fromEmail: FROM_EMAIL,
          fromName: FROM_NAME,
          recipient,
          message,
        });
        if (response.status === 202) {
          await reminderLog.saveResult(logId, {
            status: "accepted",
            reason: null,
            provider_message_id: response.headers.get("x-message-id"),
          });
          accepted++;
        } else {
          await reminderLog.saveResult(logId, {
            status: "failed",
            reason: `mailersend_http_${response.status}`,
          });
          failed++;
        }
      } catch {
        await reminderLog.saveResult(logId, {
          status: "failed",
          reason: "mailersend_request_failed",
        });
        failed++;
      }
    }
  }
  return Response.json({
    ok: true,
    month: reminderMonth,
    accepted,
    failed,
    skipped,
  });
});
