/* Connect private record import and backup export event workflows. */
(() => {
  "use strict";

  function create(context) {
    const { attachEvents: attachCsvImportEvents } =
      window.PropertyDeskCsvImportWorkflow.create(context);
    const { attachEvents: attachExportEvents } =
      window.PropertyDeskBackupExport.create(context);

    return { attachCsvImportEvents, attachExportEvents };
  }

  window.PropertyDeskDataTransferWorkflow = Object.freeze({ create });
})();
