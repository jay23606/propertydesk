/* Collect the private backup workflow and exporter dependencies. */
(() => {
  "use strict";

  function createBackupWorkspaceModuleCatalog() {
    return Object.freeze({
      backup: window.PropertyDeskBackupWorkspaceWorkflow,
      zipUtils: window.PropertyDeskZipUtils,
      utils: window.PropertyDeskBackupUtils,
      records: window.PropertyDeskBackupRecords,
      exporter: {
        create: window.PropertyDeskBackupExport.create,
        modules: { archive: window.PropertyDeskBackupArchive },
      },
    });
  }

  window.PropertyDeskBackupWorkspaceModuleCatalog = Object.freeze({
    create: createBackupWorkspaceModuleCatalog,
  });
})();
