/* Assemble workspace records and private agreements into a ZIP backup. */
(() => {
  "use strict";

  function create({
    createBackup = window.PropertyDeskBackupUtils.createBackup,
    zipUtils = window.PropertyDeskZipUtils,
    loadBackupRecords = window.PropertyDeskBackupRecords.load,
    collectBackupAgreementFiles = window.PropertyDeskBackupAgreementFiles
      .collect,
    now = () => new Date(),
  } = {}) {
    async function prepare({ client, workspaceOwnerId }) {
      const records = await loadBackupRecords(client);
      const { entries, includedFiles } = await collectBackupAgreementFiles({
        documents: records.pd_documents,
        client,
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
