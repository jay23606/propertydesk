/* Summarize posted income and operating expenses for the current month. */
(() => {
  "use strict";

  function createTransactionSummaryModel({
    getPayments,
    getExpenses,
    postedOnOrAfter,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
  }) {
    function currentMonthTotals() {
      const currentMonthStart = monthStart();
      const monthPayments = postedOnOrAfter(
        getPayments(),
        "received_date",
        currentMonthStart,
      );
      const monthExpenses = postedOnOrAfter(
        getExpenses(),
        "expense_date",
        currentMonthStart,
      );
      const collected = sumIncome(monthPayments);
      const expenses = sumOperatingExpenses(monthExpenses);

      return { collected, expenses, netCashFlow: collected - expenses };
    }

    return Object.freeze({ currentMonthTotals });
  }

  window.PropertyDeskTransactionSummaryModel = Object.freeze({
    create: createTransactionSummaryModel,
  });
})();
