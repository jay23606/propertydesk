/* Compose workspace backup records, archive creation, and export actions. */
(() => {
  "use strict";

  function createBackupWorkspaceWorkflow({
    $,
    state,
    isClientReady,
    now,
    todayIso,
    toast,
    downloadBlob,
    zipUtils,
    workspaceTables,
    loadAllPages,
    collectBackupAgreementFiles,
    documentRepository,
    workflows,
  }) {
    const backup = workflows.utils.create({ workspaceTables });
    const records = workflows.records.create({
      tables: backup.tables,
      loadAllPages,
    });
    const exporter = workflows.exporter.create({
      $,
      state,
      isClientReady,
      now,
      createBackup: backup.createBackup,
      todayIso,
      toast,
      downloadBlob,
      zipUtils,
      loadBackupRecords: records.load,
      collectBackupAgreementFiles,
      documentRepository,
      modules: workflows.exporter.modules,
    });

    return Object.freeze({
      attachBackupExportEvents: exporter.attachBackupExportEvents,
    });
  }

  window.PropertyDeskBackupWorkspaceWorkflow = Object.freeze({
    create: createBackupWorkspaceWorkflow,
  });
})();
