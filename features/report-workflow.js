/* Compose portfolio report model and rendering. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      dateOnly,
      esc,
      money,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
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
    return { renderReports };
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
