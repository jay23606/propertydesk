/* Workspace-scoped reads used to hydrate the PropertyDesk client state. */
(() => {
  "use strict";

  const WORKSPACE_READS = [
    {
      key: "properties",
      table: "pd_properties",
      order: [["created_at", false]],
    },
    {
      key: "accounts",
      table: "pd_accounts",
      order: [["created_at", false]],
    },
    {
      key: "payments",
      table: "pd_payments",
      order: [
        ["received_date", false],
        ["recorded_at", false],
      ],
    },
    {
      key: "expenses",
      table: "pd_expenses",
      order: [
        ["expense_date", false],
        ["recorded_at", false],
      ],
    },
    {
      key: "importBatches",
      table: "pd_import_batches",
      order: [["created_at", false]],
    },
    {
      key: "documents",
      table: "pd_documents",
      order: [["created_at", false]],
    },
    {
      key: "agreementVersions",
      table: "pd_agreement_versions",
      order: [["replaced_on", false]],
    },
    { key: "propertyHolders", table: "pd_property_holders" },
    { key: "workspaceMembers", rpc: "pd_list_workspace_members" },
    {
      key: "depositEntries",
      table: "pd_deposit_entries",
      order: [
        ["movement_date", false],
        ["created_at", false],
      ],
    },
    {
      key: "reminderLogs",
      table: "pd_reminder_logs",
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
