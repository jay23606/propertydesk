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
      ...exportOptions,
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
