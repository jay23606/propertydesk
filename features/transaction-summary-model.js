/* Summarize posted income and operating expenses for the current month. */
(() => {
  "use strict";

  function createTransactionSummaryModel({
    state,
    postedOnOrAfter,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
  }) {
    function currentMonthTotals() {
      const currentMonthStart = monthStart();
      const monthPayments = postedOnOrAfter(
        state.payments,
        "received_date",
        currentMonthStart,
      );
      const monthExpenses = postedOnOrAfter(
        state.expenses,
        "expense_date",
        currentMonthStart,
      );
      const collected = sumIncome(monthPayments);
      const expenses = sumOperatingExpenses(monthExpenses);

      return { collected, expenses, netCashFlow: collected - expenses };
    }

    return { currentMonthTotals };
  }

  window.PropertyDeskTransactionSummaryModel = Object.freeze({
    create: createTransactionSummaryModel,
  });
})();
