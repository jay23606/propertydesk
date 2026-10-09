/* Assemble workspace records and private agreements into a ZIP backup. */
(() => {
  "use strict";

  function create({
    createBackup,
    zipUtils,
    loadBackupRecords,
    collectBackupAgreementFiles,
    documentRepository,
    now,
  }) {
    async function prepare({ workspaceOwnerId }) {
      const records = await loadBackupRecords();
      const { entries, includedFiles } = await collectBackupAgreementFiles({
        documents: records.pd_documents,
        repository: documentRepository,
        workspaceOwnerId,
      });
      const exportedAt = now();
      const backup = createBackup(
        records,
        exportedAt.toISOString(),
        includedFiles,
      );
      entries.unshift({
        name: "propertydesk-backup.json",
        data: JSON.stringify(backup, null, 2),
      });
      const blob = zipUtils.createZip(entries, exportedAt);
      const recordCount = Object.values(records).reduce(
        (sum, tableRows) => sum + tableRows.length,
        0,
      );
      return { blob, recordCount, agreementCount: includedFiles.length };
    }

    return Object.freeze({ prepare });
  }

  window.PropertyDeskBackupArchive = Object.freeze({ create });
})();
