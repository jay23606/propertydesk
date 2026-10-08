/* Compose Reports calculations and screen rendering. */
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
    return Object.freeze({ renderReports });
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
