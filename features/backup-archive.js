/* Assemble workspace records and private agreements into a ZIP backup. */
(() => {
  "use strict";

  function create({
    createBackup,
    zipUtils,
    loadBackupRecords,
    collectBackupAgreementFiles,
    documentRepository,
    now = () => new Date(),
  }) {
    async function prepare({ workspaceOwnerId }) {
      const records = await loadBackupRecords();
      const { entries, includedFiles } = await collectBackupAgreementFiles({
        documents: records.pd_documents,
        repository: documentRepository,
        workspaceOwnerId,
      });
      const backup = createBackup(records, now().toISOString(), includedFiles);
      entries.unshift({
        name: "propertydesk-backup.json",
        data: JSON.stringify(backup, null, 2),
      });
      const blob = zipUtils.createZip(entries);
      const recordCount = Object.values(records).reduce(
        (sum, tableRows) => sum + tableRows.length,
        0,
      );
      return { blob, recordCount, agreementCount: includedFiles.length };
    }

    return { prepare };
  }

  window.PropertyDeskBackupArchive = Object.freeze({ create });
})();
