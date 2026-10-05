/* Render month-end reminder delivery history in workspace settings. */
(() => {
  "use strict";

  function createReminderActivityView({ $, state, esc, fmtDate, money }) {
    function renderReminderActivity() {
      $("reminder-activity").innerHTML = state.reminderLogs.length
        ? state.reminderLogs
            .map((log) => {
              const account = state.accounts.find(
                (item) => item.id === log.account_id,
              );
              const property = state.properties.find(
                (item) => item.id === account?.property_id,
              );
              const status =
                log.status === "accepted"
                  ? "Accepted by MailerSend"
                  : log.status === "failed"
                    ? "Failed"
                    : log.status === "skipped"
                      ? "Skipped"
                      : "Sending";
              const detail =
                log.reason === "payment_recorded_this_month"
                  ? "A payment was recorded this month"
                  : log.reason === "no_unpaid_scheduled_amount"
                    ? "No scheduled amount was due"
                    : log.reason === "missing_recipient_email"
                      ? "No valid recipient email is saved"
                      : log.reason?.startsWith("mailersend_http_")
                        ? "MailerSend rejected the request"
                        : log.reason === "mailersend_request_failed"
                          ? "MailerSend request failed"
                          : log.reason || "Month-end check";
              return `<tr><td>${fmtDate(log.reminder_month, { month: "short", year: "numeric" })}</td>
            <td>${esc(property?.address || property?.name || "Property")}<small class="table-subtext">${esc(account?.party_name || account?.name || "Account")}</small></td>
            <td>${log.recipient_index ? `Recipient ${esc(log.recipient_index)}` : "No valid recipient"}</td>
            <td><span class="reminder-status reminder-${esc(log.status)}">${esc(status)}</span></td>
            <td>${esc(detail)}${log.unpaid_due != null ? `<small class="table-subtext">Unpaid due: ${money(log.unpaid_due)}</small>` : ""}</td>
            <td>${esc(new Date(log.attempted_at).toLocaleString())}</td></tr>`;
            })
            .join("")
        : '<tr><td colspan="6" class="muted">Reminder attempts will appear here. Reminders are off until you enable them in an account.</td></tr>';
    }

    return { renderReminderActivity };
  }

  window.PropertyDeskReminderActivityView = Object.freeze({
    create: createReminderActivityView,
  });
})();
