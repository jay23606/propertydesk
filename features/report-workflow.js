/* Compose portfolio report rendering and CSV export controls. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, dateOnly, esc, money, sumIncome, sumOperatingExpenses,
      accountBalance, todayIso, prettyType,
    } = context;
    const { renderReports } = window.PropertyDeskReportViews.create({
      $, state, dateOnly, esc, money, sumIncome, sumOperatingExpenses,
      accountBalance,
    });
    const { attachEvents: attachReportExportEvents } =
      window.PropertyDeskReportExport.create({
        $, state, todayIso, prettyType, accountBalance,
      });

    return { renderReports, attachReportExportEvents };
  }

  window.PropertyDeskReportWorkflow = Object.freeze({ create });
})();
