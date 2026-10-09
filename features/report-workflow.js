/* Compose Reports calculations and screen rendering. */
(() => {
  "use strict";

  function create({
    $,
    state,
    now,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
    esc,
    money,
    fmtDateTime,
    workflows,
  }) {
    const { buildReportModel } = workflows.model.create({
      state,
      now,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    });
    const { renderReports } = workflows.views.create({
      $,
      esc,
      money,
      fmtDateTime,
      buildReportModel,
    });
    return Object.freeze({ renderReports });
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
