/* Resolve reminder history rows before the settings view renders them. */
(() => {
  "use strict";

  const STATUS_LABELS = new Map([
    ["accepted", "Accepted by MailerSend"],
    ["failed", "Failed"],
    ["skipped", "Skipped"],
  ]);
  const DETAIL_LABELS = new Map([
    ["payment_recorded_this_month", "A payment was recorded this month"],
    ["no_unpaid_scheduled_amount", "No scheduled amount was due"],
    ["missing_recipient_email", "No valid recipient email is saved"],
    ["mailersend_request_failed", "MailerSend request failed"],
  ]);

  function createReminderActivityModel({ state }) {
    function statusLabel(status) {
      return STATUS_LABELS.get(status) || "Sending";
    }

    function detailLabel(reason) {
      return (
        DETAIL_LABELS.get(reason) ||
        (reason?.startsWith("mailersend_http_")
          ? "MailerSend rejected the request"
          : reason || "Month-end check")
      );
    }

    function propertyDisplayLabel(property) {
      return property?.address || property?.name || "Property";
    }

    function accountDisplayLabel(account) {
      return account?.party_name || account?.name || "Account";
    }

    function buildRow(log, accounts, properties) {
      const account = accounts.get(log.account_id);
      const property = properties.get(account?.property_id);
      return {
        reminderMonth: log.reminder_month,
        propertyLabel: propertyDisplayLabel(property),
        accountLabel: accountDisplayLabel(account),
        recipientIndex: log.recipient_index,
        status: log.status,
        statusLabel: statusLabel(log.status),
        detail: detailLabel(log.reason),
        unpaidDue: log.unpaid_due,
        attemptedAt: log.attempted_at,
      };
    }

    function buildRows() {
      const accounts = new Map(
        state.accounts.map((account) => [account.id, account]),
      );
      const properties = new Map(
        state.properties.map((property) => [property.id, property]),
      );

      return state.reminderLogs.map((log) =>
        buildRow(log, accounts, properties),
      );
    }

    return Object.freeze({ buildRows });
  }

  window.PropertyDeskReminderActivityModel = Object.freeze({
    create: createReminderActivityModel,
  });
})();
