import { hasQualifyingPaymentInMonth } from "./reminder-schedule.mjs";

export async function deliverReminderRecipient({
  account,
  property,
  accountPayments,
  recipient,
  recipientIndex,
  reminderMonth,
  monthStart,
  monthEnd,
  unpaidDue,
  reminderLog,
  reminderMessage,
  sendReminderEmail,
  mailerSendToken,
  fromEmail,
  fromName,
  now = () => new Date(),
}) {
  let reason = null;
  if (!recipient) reason = "missing_recipient_email";
  else if (hasQualifyingPaymentInMonth(accountPayments, monthStart, monthEnd)) {
    reason = "payment_recorded_this_month";
  } else if (unpaidDue <= 0) {
    reason = "no_unpaid_scheduled_amount";
  }

  const logRow = {
    user_id: account.user_id,
    account_id: account.id,
    reminder_month: reminderMonth,
    recipient_index: recipientIndex,
    reason,
    unpaid_due: unpaidDue,
    status: reason ? "skipped" : "sending",
    attempted_at: now().toISOString(),
  };
  if (reason) {
    try {
      await reminderLog.recordSkipped(logRow);
      return "skipped";
    } catch {
      return "failed";
    }
  }

  const logId = await reminderLog.claim(logRow);
  if (!logId) return "already_handled";
  try {
    const message = reminderMessage(
      account,
      property,
      monthStart,
      monthEnd,
      unpaidDue,
    );
    const response = await sendReminderEmail({
      token: mailerSendToken,
      fromEmail,
      fromName,
      recipient,
      message,
    });
    if (response.status === 202) {
      await reminderLog.saveResult(logId, {
        status: "accepted",
        reason: null,
        provider_message_id: response.headers.get("x-message-id"),
      });
      return "accepted";
    }

    await reminderLog.saveResult(logId, {
      status: "failed",
      reason: `mailersend_http_${response.status}`,
    });
    return "failed";
  } catch {
    await reminderLog.saveResult(logId, {
      status: "failed",
      reason: "mailersend_request_failed",
    });
    return "failed";
  }
}
