/* Connect report calculations, screen rendering, and account CSV export. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
      todayIso,
      prettyType,
      esc,
      money,
    } = context;
    const { buildReportModel } = window.PropertyDeskReportModel.create({
      state,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    });
    const { renderReports } = window.PropertyDeskReportViews.create({
      $,
      esc,
      money,
      buildReportModel,
    });
    const { attachEvents } = window.PropertyDeskReportExport.create({
      $,
      state,
      todayIso,
      prettyType,
      accountBalance,
    });

    return { renderReports, attachReportExportEvents: attachEvents };
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
