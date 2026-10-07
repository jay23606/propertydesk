/* Compose Reports calculations, rendering, and CSV export actions. */
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
      todayIso,
      prettyType,
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

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
