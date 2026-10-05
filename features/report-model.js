/* Calculate current-year financial totals and account counts for reports. */
(() => {
  "use strict";

  function createReportModel({
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  }) {
    function buildReportModel(year = new Date().getFullYear()) {
      const income = sumIncome(
        state.payments.filter(
          (payment) => dateOnly(payment.received_date)?.getFullYear() === year,
        ),
      );
      const costs = sumOperatingExpenses(
        state.expenses.filter(
          (expense) => dateOnly(expense.expense_date)?.getFullYear() === year,
        ),
      );
      const principal = state.accounts
        .filter((account) => account.account_type !== "rental")
        .reduce((sum, account) => sum + accountBalance(account), 0);

      return {
        year,
        income,
        costs,
        netCashFlow: income - costs,
        principal,
        accountCounts: {
          rental: state.accounts.filter(
            (account) => account.account_type === "rental",
          ).length,
          land_contract: state.accounts.filter(
            (account) => account.account_type === "land_contract",
          ).length,
          note: state.accounts.filter(
            (account) => account.account_type === "note",
          ).length,
        },
        importBatches: state.importBatches,
      };
    }

    return { buildReportModel };
  }

  window.PropertyDeskReportModel = Object.freeze({ create: createReportModel });
})();
