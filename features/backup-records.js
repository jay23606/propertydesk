/* Read the workspace tables included in a private backup. */
(() => {
  "use strict";

  const tables = Object.freeze([
    "pd_properties",
    "pd_accounts",
    "pd_agreement_versions",
    "pd_payments",
    "pd_expenses",
    "pd_deposit_entries",
    "pd_documents",
    "pd_import_batches",
    "pd_audit_events",
    "pd_workspace_members",
    "pd_property_holders",
  ]);

  async function loadBackupRecords(client) {
    async function exportTable(table) {
      const pageSize = 500;
      const rows = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await client
          .from(table)
          .select("*")
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    }

    const values = await Promise.all(tables.map(exportTable));
    return Object.fromEntries(
      tables.map((table, index) => [table, values[index]]),
    );
  }

  window.PropertyDeskBackupRecords = Object.freeze({
    tables,
    load: loadBackupRecords,
  });
})();
