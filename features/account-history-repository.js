/* Read the bounded audit-event set needed to render an account history. */
(() => {
  "use strict";

  function create({ getClient }) {
    async function loadAccountAuditEvents(auditIds) {
      try {
        const result = await getClient()
          .from("pd_audit_events")
          .select("id,entity_type,entity_id,action,created_at")
          .in("entity_id", auditIds)
          .order("created_at", { ascending: false })
          .limit(100);
        return {
          events: result.data || [],
          error: Boolean(result.error),
        };
      } catch {
        return { events: [], error: true };
      }
    }

    return Object.freeze({ loadAccountAuditEvents });
  }

  window.PropertyDeskAccountHistoryRepository = Object.freeze({ create });
})();
