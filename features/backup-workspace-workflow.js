/* Compose workspace backup records, archive creation, and export actions. */
(() => {
  "use strict";

  function createBackupWorkspaceWorkflow({
    $,
    state,
    todayIso,
    toast,
    downloadBlob,
    zipUtils,
    workspaceTables,
    loadAllPages,
    collectBackupAgreementFiles,
    documentRepository,
  }) {
    const backup = window.PropertyDeskBackupUtils.create({ workspaceTables });
    const records = window.PropertyDeskBackupRecords.create({
      tables: backup.tables,
      loadAllPages,
    });
    const exporter = window.PropertyDeskBackupExport.create({
      $,
      state,
      createBackup: backup.createBackup,
      todayIso,
      toast,
      downloadBlob,
      zipUtils,
      loadBackupRecords: records.load,
      collectBackupAgreementFiles,
      documentRepository,
    });

    return { attachEvents: exporter.attachEvents };
  }

  window.PropertyDeskBackupWorkspaceWorkflow = Object.freeze({
    create: createBackupWorkspaceWorkflow,
  });
})();
