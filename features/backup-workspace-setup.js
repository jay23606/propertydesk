/* Wire workspace backup records and private agreement export dependencies. */
(() => {
  "use strict";

  function createBackupWorkspaceSetup({ records, ui, services, workflows }) {
    return workflows.backup.create({
      backupRecords: {
        workspaceTables: services.workspaceTables,
        loadAllPages: services.loadAllPages,
      },
      exportOptions: {
        $: ui.$,
        getUser: records.getUser,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        isClientReady: services.isClientReady,
        now: ui.now,
        todayIso: ui.todayIso,
        toast: ui.toast,
        downloadBlob: services.downloadBlob,
        zipUtils: workflows.zipUtils,
        collectBackupAgreementFiles: services.collectBackupAgreementFiles,
        documentRepository: {
          download: services.documentRepository.download,
        },
      },
      workflows: {
        utils: workflows.utils,
        records: workflows.records,
        exporter: {
          create: workflows.exporter.create,
          modules: workflows.exporter.modules,
        },
      },
    });
  }

  window.PropertyDeskBackupWorkspaceSetup = Object.freeze({
    create: createBackupWorkspaceSetup,
  });
})();
