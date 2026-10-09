/* Wire workspace backup records and private agreement export dependencies. */
(() => {
  "use strict";

  function createBackupWorkspaceSetup({ records, ui, services, workflows }) {
    return workflows.backup.create({
      $: ui.$,
      getUser: records.getUser,
      getWorkspaceOwnerId: records.getWorkspaceOwnerId,
      isClientReady: services.isClientReady,
      now: ui.now,
      todayIso: ui.todayIso,
      toast: ui.toast,
      downloadBlob: services.downloadBlob,
      zipUtils: workflows.zipUtils,
      workspaceTables: services.workspaceTables,
      loadAllPages: services.loadAllPages,
      collectBackupAgreementFiles: services.collectBackupAgreementFiles,
      documentRepository: services.documentRepository,
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
