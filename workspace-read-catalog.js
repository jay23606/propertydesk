/* Explicit inventory of workspace records hydrated into client state. */
(() => {
  "use strict";

  function createWorkspaceReadCatalog(tables) {
    return Object.freeze([
      {
        key: "properties",
        table: tables.properties,
        order: [["created_at", false]],
      },
      {
        key: "accounts",
        table: tables.accounts,
        order: [["created_at", false]],
      },
      {
        key: "payments",
        table: tables.payments,
        order: [
          ["received_date", false],
          ["recorded_at", false],
        ],
      },
      {
        key: "expenses",
        table: tables.expenses,
        order: [
          ["expense_date", false],
          ["recorded_at", false],
        ],
      },
      {
        key: "importBatches",
        table: tables.importBatches,
        order: [["created_at", false]],
      },
      {
        key: "documents",
        table: tables.documents,
        order: [["created_at", false]],
      },
      {
        key: "agreementVersions",
        table: tables.agreementVersions,
        order: [["replaced_on", false]],
      },
      { key: "propertyHolders", table: tables.propertyHolders },
      { key: "workspaceMembers", rpc: "pd_list_workspace_members" },
      {
        key: "depositEntries",
        table: tables.depositEntries,
        order: [
          ["movement_date", false],
          ["created_at", false],
        ],
      },
      {
        key: "reminderLogs",
        table: tables.reminderLogs,
        order: [["attempted_at", false]],
        limit: 300,
      },
    ]);
  }

  window.PropertyDeskWorkspaceReadCatalog = Object.freeze({
    create: createWorkspaceReadCatalog,
  });
})();
