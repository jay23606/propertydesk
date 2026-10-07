import { deliverReminderRecipient } from "./reminder-delivery.mjs";
import { sendReminderEmail } from "./mailersend.mjs";
import { reminderMessage } from "./reminder-message.mjs";
import { createReminderLogStore } from "./reminder-log.mjs";
import {
  loadEnabledReminderAccounts,
  loadReminderRecords,
} from "./reminder-repository.mjs";
import {
  calculateUnpaidDue,
  isLastCalendarDayInNewYork,
  monthWindowInNewYork,
  parseReminderRecipients,
  TRACKING_START,
} from "./reminder-schedule.mjs";

const DEFAULT_FROM_EMAIL = "notifications@propertydesk.dynv6.net";

export function createMonthEndReminderHandler({
  getEnv,
  createClient,
  now = () => new Date(),
  createLogStore = createReminderLogStore,
  sendEmail = sendReminderEmail,
}) {
  return async function handleMonthEndReminder(request) {
    // This job is invoked by pg_cron, not by browser code. Do not expose a
    // wildcard CORS policy for an endpoint guarded by a server-side secret.
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204 });
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });

    const expectedSecret = getEnv("PD_REMINDER_CRON_SECRET");
    if (
      !expectedSecret ||
      request.headers.get("x-propertydesk-cron-secret") !== expectedSecret
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentTime = now();
    if (!isLastCalendarDayInNewYork(currentTime))
      return Response.json({ ok: true, skipped: "not_last_day_of_month" });
    const { monthStart, monthEnd } = monthWindowInNewYork(currentTime);
    const reminderMonth = monthStart;
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const mailerSendToken = getEnv("MAILERSEND_API_TOKEN");
    if (!supabaseUrl || !serviceRoleKey || !mailerSendToken) {
      return Response.json(
        { error: "Reminder service is not configured" },
        { status: 500 },
      );
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const reminderLog = createLogStore(db);
    const { data: accounts, error: accountsError } =
      await loadEnabledReminderAccounts(db);
    if (accountsError)
      return Response.json(
        { error: "Could not load enabled reminder accounts" },
        { status: 500 },
      );
    const enabled = accounts ?? [];
    if (!enabled.length)
      return Response.json({ ok: true, month: reminderMonth, processed: 0 });

    const {
      payments,
      properties: propertyRows,
      error: recordsError,
    } = await loadReminderRecords(db, enabled, monthEnd, TRACKING_START);
    if (recordsError)
      return Response.json(
        { error: "Could not load reminder records" },
        { status: 500 },
      );
    const properties = new Map(
      propertyRows.map((property) => [property.id, property]),
    );
    let accepted = 0;
    let failed = 0;
    let skipped = 0;

    for (const account of enabled) {
      const property = properties.get(account.property_id);
      if (!property) continue;
      const accountPayments = payments.filter(
        (payment) => payment.account_id === account.id,
      );
      const recipients = parseReminderRecipients(account.party_email).sort(
        (left, right) => left.localeCompare(right),
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
            recipientIndex: index + 1,
          }))
        : [{ recipient: null, recipientIndex: 0 }];
      for (const { recipient, recipientIndex } of rows) {
        const outcome = await deliverReminderRecipient({
          account,
          property,
          accountPayments,
          recipient,
          recipientIndex,
          reminderMonth,
          monthStart,
          monthEnd,
          unpaidDue: due.total,
          reminderLog,
          reminderMessage,
          sendReminderEmail: sendEmail,
          mailerSendToken,
          fromEmail: getEnv("MAILERSEND_FROM_EMAIL") || DEFAULT_FROM_EMAIL,
          fromName: "PropertyDesk",
        });
        if (outcome === "accepted") accepted++;
        else if (outcome === "failed") failed++;
        else if (outcome === "skipped") skipped++;
      }
    }
    return Response.json({
      ok: true,
      month: reminderMonth,
      accepted,
      failed,
      skipped,
    });
  };
}
