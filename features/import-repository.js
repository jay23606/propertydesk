/* Run the workspace-scoped database procedures for CSV import batches. */
(() => {
  "use strict";

  function create({ getClient }) {
    async function commitAccounts({ rows, sourceName, total }) {
      const { data, error } = await getClient().rpc(
        "pd_import_propertydesk_accounts",
        {
          p_rows: rows,
          p_source_name: sourceName,
          p_rows_total: total,
        },
      );
      if (error) throw error;
      return data;
    }

    async function commitTransactions({ kind, rows, sourceName, total }) {
      const { data, error } = await getClient().rpc(
        "pd_import_propertydesk_transactions",
        {
          p_kind: kind,
          p_rows: rows,
          p_source_name: sourceName,
          p_rows_total: total,
        },
      );
      if (error) throw error;
      return data;
    }

    return { commitAccounts, commitTransactions };
  }

  window.PropertyDeskImportRepository = Object.freeze({ create });
})();
