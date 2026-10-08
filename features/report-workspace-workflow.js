/* Connect Reports rendering and CSV export at the feature boundary. */
(() => {
  "use strict";

  function createReportWorkspaceWorkflow({ rendering, exporting }) {
    const { renderReports } =
      window.PropertyDeskReportWorkflow.create(rendering);
    const { attachEvents: attachReportExportEvents } =
      window.PropertyDeskReportExport.create(exporting);

    return Object.freeze({ renderReports, attachReportExportEvents });
  }

  window.PropertyDeskReportWorkspaceWorkflow = Object.freeze({
    create: createReportWorkspaceWorkflow,
  });
})();
