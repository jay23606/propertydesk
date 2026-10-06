/* Build the versioned manifest for a private PropertyDesk backup. */
(() => {
  "use strict";

  const workspaceTables = globalThis.PropertyDeskWorkspaceTables;
  if (!workspaceTables)
    throw new Error("The workspace table catalog is not loaded.");
  const tables = Object.freeze(Object.values(workspaceTables));

  function createBackup(
    records,
    exportedAt = new Date().toISOString(),
    includedFiles = [],
  ) {
    const data = Object.fromEntries(
      tables.map((table) => [
        table,
        Array.isArray(records?.[table]) ? records[table] : [],
      ]),
    );
    return {
      manifest: {
        format: "propertydesk-backup",
        format_version: 7,
        schema_version: 7,
        exported_at: exportedAt,
        restore_supported: false,
        included_tables: tables,
        record_counts: Object.fromEntries(
          tables.map((table) => [table, data[table].length]),
        ),
        included_files: includedFiles.map((file) => ({
          path: file.path,
          file_name: file.file_name,
          content_type: file.content_type,
          file_size: file.file_size,
          property_id: file.property_id,
          account_id: file.account_id,
        })),
        file_count: includedFiles.length,
      },
      data,
    };
  }

  const helpers = Object.freeze({ tables, createBackup });
  globalThis.PropertyDeskBackupUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
