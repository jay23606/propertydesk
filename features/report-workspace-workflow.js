/* Connect Reports rendering and CSV export at the feature boundary. */
(() => {
  "use strict";

  function createReportWorkspaceWorkflow({ rendering, exporting, workflows }) {
    const { renderReports } = workflows.report.create({
      ...rendering,
      workflows: { model: workflows.model, views: workflows.views },
    });
    const { attachEvents: attachReportExportEvents } =
      workflows.exporter.create({
        ...exporting,
      });

    return Object.freeze({ renderReports, attachReportExportEvents });
  }

  window.PropertyDeskReportWorkspaceWorkflow = Object.freeze({
    create: createReportWorkspaceWorkflow,
  });
})();
