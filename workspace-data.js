/* Workspace-scoped reads used to hydrate the PropertyDesk client state. */
(() => {
  "use strict";

  const tables = window.PropertyDeskWorkspaceTables;
  const WORKSPACE_READS = [
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
  ];

  function create() {
    const { runWorkspaceRead } = window.PropertyDeskWorkspaceQuery;

    function loadWorkspaceId(client) {
      return client.rpc("pd_workspace_id");
    }

    async function loadWorkspaceRecords(client, workspaceId) {
      const requests = WORKSPACE_READS.map((read) => [
        read.key,
        () => runWorkspaceRead(client, workspaceId, read),
      ]);

      const results = await Promise.all(requests.map(([, run]) => run()));
      const failedResult = results.find((result) => result.error);
      if (failedResult) {
        throw failedResult.error;
      }

      return Object.fromEntries(
        requests.map(([key], index) => [key, results[index].data || []]),
      );
    }

    return { loadWorkspaceId, loadWorkspaceRecords };
  }

  window.PropertyDeskWorkspaceData = Object.freeze({ create });
})();
