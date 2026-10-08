/* Compose Reports calculations and screen rendering. */
(() => {
  "use strict";

  function create({
    $,
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
    esc,
    money,
    workflows,
  }) {
    const { buildReportModel } = workflows.model.create({
      state,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    });
    const { renderReports } = workflows.views.create({
      $,
      esc,
      money,
      buildReportModel,
    });
    return Object.freeze({ renderReports });
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
