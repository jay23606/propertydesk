/* Summarize posted income and operating expenses for the current month. */
(() => {
  "use strict";

  function createTransactionSummaryModel({
    state,
    isPosted,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
  }) {
    function currentMonthTotals() {
      const currentMonthStart = monthStart();
      const monthPayments = state.payments.filter(
        (payment) =>
          isPosted(payment) &&
          String(payment.received_date) >= currentMonthStart,
      );
      const monthExpenses = state.expenses.filter(
        (expense) =>
          String(expense.expense_date) >= currentMonthStart &&
          isPosted(expense),
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
