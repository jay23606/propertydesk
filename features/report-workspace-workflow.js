/* Connect Reports rendering and CSV export at the feature boundary. */
(() => {
  "use strict";

  function createReportWorkspaceWorkflow({ rendering, exporting, workflows }) {
    const { renderReports } = workflows.report.create({
      $: rendering.$,
      getPayments: rendering.getPayments,
      getExpenses: rendering.getExpenses,
      getAccounts: rendering.getAccounts,
      getImportBatches: rendering.getImportBatches,
      now: rendering.now,
      dateOnly: rendering.dateOnly,
      sumIncome: rendering.sumIncome,
      sumOperatingExpenses: rendering.sumOperatingExpenses,
      accountBalance: rendering.accountBalance,
      esc: rendering.esc,
      money: rendering.money,
      fmtDateTime: rendering.fmtDateTime,
      workflows: { model: workflows.model, views: workflows.views },
    });
    const { attachEvents: attachReportExportEvents } =
      workflows.exporter.create({
        $: exporting.$,
        getAccounts: exporting.getAccounts,
        getProperties: exporting.getProperties,
        todayIso: exporting.todayIso,
        prettyType: exporting.prettyType,
        accountBalance: exporting.accountBalance,
        downloadBlob: exporting.downloadBlob,
      });

    return Object.freeze({ renderReports, attachReportExportEvents });
  }

  window.PropertyDeskReportWorkspaceWorkflow = Object.freeze({
    create: createReportWorkspaceWorkflow,
  });
})();
