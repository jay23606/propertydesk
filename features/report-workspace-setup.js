/* Connect Reports data readers, presentation helpers, and export actions. */
(() => {
  "use strict";

  function createReportWorkspaceSetup({ records, ui, services, workflows }) {
    return workflows.reportWorkspace.create({
      rendering: {
        $: ui.$,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        getAccounts: records.getAccounts,
        getImportBatches: records.getImportBatches,
        now: ui.now,
        dateOnly: ui.dateOnly,
        sumIncome: ui.sumIncome,
        sumOperatingExpenses: ui.sumOperatingExpenses,
        accountBalance: ui.accountBalance,
        esc: ui.esc,
        money: ui.money,
        fmtDateTime: ui.fmtDateTime,
      },
      exporting: {
        $: ui.$,
        getAccounts: records.getAccounts,
        getProperties: records.getProperties,
        todayIso: ui.todayIso,
        prettyType: ui.prettyType,
        accountBalance: ui.accountBalance,
        downloadBlob: services.downloadBlob,
      },
      workflows: {
        report: workflows.report,
        exporter: workflows.exporter,
        model: workflows.model,
        views: workflows.views,
      },
    });
  }

  window.PropertyDeskReportWorkspaceSetup = Object.freeze({
    create: createReportWorkspaceSetup,
  });
})();
