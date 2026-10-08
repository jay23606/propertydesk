/* Connect Reports rendering and CSV export at the feature boundary. */
(() => {
  "use strict";

  function createReportWorkspaceWorkflow({ rendering, exporting }) {
    const { renderReports } = window.PropertyDeskReportWorkflow.create({
      $: rendering.$,
      state: rendering.state,
      dateOnly: rendering.dateOnly,
      sumIncome: rendering.sumIncome,
      sumOperatingExpenses: rendering.sumOperatingExpenses,
      accountBalance: rendering.accountBalance,
      esc: rendering.esc,
      money: rendering.money,
    });
    const { attachEvents: attachReportExportEvents } =
      window.PropertyDeskReportExport.create({
        $: exporting.$,
        state: exporting.state,
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
