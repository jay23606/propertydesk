/* Compose workspace backup records, archive creation, and export actions. */
(() => {
  "use strict";

  function createBackupWorkspaceWorkflow({
    backupRecords,
    exportOptions,
    workflows,
  }) {
    const backup = workflows.utils.create({
      workspaceTables: backupRecords.workspaceTables,
    });
    const records = workflows.records.create({
      tables: backup.tables,
      loadAllPages: backupRecords.loadAllPages,
    });
    const exporter = workflows.exporter.create({
      $: exportOptions.$,
      getUser: exportOptions.getUser,
      getWorkspaceOwnerId: exportOptions.getWorkspaceOwnerId,
      isClientReady: exportOptions.isClientReady,
      now: exportOptions.now,
      todayIso: exportOptions.todayIso,
      toast: exportOptions.toast,
      downloadBlob: exportOptions.downloadBlob,
      zipUtils: exportOptions.zipUtils,
      collectBackupAgreementFiles: exportOptions.collectBackupAgreementFiles,
      documentRepository: exportOptions.documentRepository,
      createBackup: backup.createBackup,
      loadBackupRecords: records.load,
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
