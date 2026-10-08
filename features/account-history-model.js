/* Load agreement term versions and map audited records for account history. */
(() => {
  "use strict";

  const auditActionLabels = Object.freeze({
    created: "Created",
    updated: "Updated",
    voided: "Voided",
    deleted: "Deleted",
  });

  function createAccountHistoryModel({ state, repository }) {
    const { loadAccountAuditEvents } = repository;
    async function loadAccountHistory(account, payments) {
      const auditIds = [
        account.id,
        ...payments.slice(0, 50).map((payment) => payment.id),
      ];
      const paymentById = new Map(
        payments.map((payment) => [payment.id, payment]),
      );
      const { events: history, error: auditError } =
        await loadAccountAuditEvents(auditIds);

      const accountVersions = state.agreementVersions.filter(
        (version) => version.account_id === account.id,
      );
      const auditEvents = history.map((event) => ({
        target: event.entity_type === "pd_accounts" ? "account" : "payment",
        action: auditActionLabels[event.action] || "Recorded",
        reason:
          event.action === "voided"
            ? paymentById.get(event.entity_id)?.void_reason || ""
            : "",
        created_at: event.created_at,
      }));

      return { accountVersions, auditEvents, auditError };
    }

    return Object.freeze({ loadAccountHistory });
  }

  window.PropertyDeskAccountHistoryModel = Object.freeze({
    create: createAccountHistoryModel,
  });
})();
