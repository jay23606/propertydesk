/* Shared inventory of PropertyDesk workspace tables. */
(() => {
  "use strict";

  const tables = Object.freeze({
    properties: "pd_properties",
    accounts: "pd_accounts",
    agreementVersions: "pd_agreement_versions",
    payments: "pd_payments",
    expenses: "pd_expenses",
    depositEntries: "pd_deposit_entries",
    documents: "pd_documents",
    importBatches: "pd_import_batches",
    auditEvents: "pd_audit_events",
    workspaceMembers: "pd_workspace_members",
    propertyHolders: "pd_property_holders",
    reminderLogs: "pd_reminder_logs",
  });

  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskWorkspaceTables = tables;
  if (typeof module !== "undefined" && module.exports) module.exports = tables;
})();
