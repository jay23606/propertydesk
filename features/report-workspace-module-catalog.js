/* Collect rendering, model, and export workflows for Reports. */
(() => {
  "use strict";

  function createReportWorkspaceModuleCatalog() {
    return Object.freeze({
      reportWorkspace: window.PropertyDeskReportWorkspaceWorkflow,
      report: window.PropertyDeskReportWorkflow,
      exporter: window.PropertyDeskReportExport,
      model: window.PropertyDeskReportModel,
      views: window.PropertyDeskReportViews,
    });
  }

  window.PropertyDeskReportWorkspaceModuleCatalog = Object.freeze({
    create: createReportWorkspaceModuleCatalog,
  });
})();
