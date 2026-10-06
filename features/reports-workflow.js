/* Compose report rendering and the account-register export action. */
(() => {
  "use strict";

  function create(context) {
    const { renderReports } = window.PropertyDeskReportWorkflow.create(context);
    const { attachEvents: attachReportExportEvents } =
      window.PropertyDeskReportExport.create(context);
    return { renderReports, attachReportExportEvents };
  }

  window.PropertyDeskReportsWorkflow = Object.freeze({ create });
})();
