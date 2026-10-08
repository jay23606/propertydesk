/* Resolve reminder history rows before the settings view renders them. */
(() => {
  "use strict";

  function createReminderActivityModel({ state }) {
    function statusLabel(status) {
      return status === "accepted"
        ? "Accepted by MailerSend"
        : status === "failed"
          ? "Failed"
          : status === "skipped"
            ? "Skipped"
            : "Sending";
    }

    function detailLabel(reason) {
      return reason === "payment_recorded_this_month"
        ? "A payment was recorded this month"
        : reason === "no_unpaid_scheduled_amount"
          ? "No scheduled amount was due"
          : reason === "missing_recipient_email"
            ? "No valid recipient email is saved"
            : reason?.startsWith("mailersend_http_")
              ? "MailerSend rejected the request"
              : reason === "mailersend_request_failed"
                ? "MailerSend request failed"
                : reason || "Month-end check";
    }

    function buildRows() {
      const accounts = new Map(
        state.accounts.map((account) => [account.id, account]),
      );
      const properties = new Map(
        state.properties.map((property) => [property.id, property]),
      );

      return state.reminderLogs.map((log) => {
        const account = accounts.get(log.account_id);
        const property = properties.get(account?.property_id);
        return {
          reminderMonth: log.reminder_month,
          propertyLabel: property?.address || property?.name || "Property",
          accountLabel: account?.party_name || account?.name || "Account",
          recipientIndex: log.recipient_index,
          status: log.status,
          statusLabel: statusLabel(log.status),
          detail: detailLabel(log.reason),
          unpaidDue: log.unpaid_due,
          attemptedAt: log.attempted_at,
        };
      });
    }

    return Object.freeze({ buildRows });
  }

  window.PropertyDeskReminderActivityModel = Object.freeze({
    create: createReminderActivityModel,
  });
})();
