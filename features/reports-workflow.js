/* Compose report rendering and the account-register export action. */
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
      todayIso,
      prettyType,
    } = context;
    const { renderReports } = window.PropertyDeskReportWorkflow.create({
      $,
      state,
      dateOnly,
      esc,
      money,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    });
    const { attachEvents: attachReportExportEvents } =
      window.PropertyDeskReportExport.create({
        $,
        state,
        todayIso,
        prettyType,
        accountBalance,
      });
    return { renderReports, attachReportExportEvents };
  }

  window.PropertyDeskReportsWorkflow = Object.freeze({ create });
})();
