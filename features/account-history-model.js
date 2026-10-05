/* Load agreement term versions and map audited records for account history. */
(() => {
  "use strict";

  function createAccountHistoryModel({ state }) {
    async function loadAccountHistory(account, payments) {
      const auditIds = [
        account.id,
        ...payments.slice(0, 50).map((payment) => payment.id),
      ];
      let history = [];
      let auditError = false;
      try {
        const result = await state.client
          .from("pd_audit_events")
          .select("id,entity_type,entity_id,action,created_at")
          .in("entity_id", auditIds)
          .order("created_at", { ascending: false })
          .limit(100);
        history = result.data || [];
        auditError = Boolean(result.error);
      } catch {
        auditError = true;
      }

      const accountVersions = state.agreementVersions.filter(
        (version) => version.account_id === account.id,
      );
      const auditEvents = history.map((event) => ({
        target: event.entity_type === "pd_accounts" ? "account" : "payment",
        action:
          event.action === "created"
            ? "Created"
            : event.action === "updated"
              ? "Updated"
              : event.action === "voided"
                ? "Voided"
                : event.action === "deleted"
                  ? "Deleted"
                  : "Recorded",
        reason:
          event.action === "voided"
            ? state.payments.find((payment) => payment.id === event.entity_id)
                ?.void_reason || ""
            : "",
        created_at: event.created_at,
      }));

      return { accountVersions, auditEvents, auditError };
    }

    return { loadAccountHistory };
  }

  window.PropertyDeskAccountHistoryModel = Object.freeze({
    create: createAccountHistoryModel,
  });
})();
