/* Calculate current-year financial totals and account counts for reports. */
(() => {
  "use strict";

  function createReportModel({
    getPayments,
    getExpenses,
    getAccounts,
    getImportBatches,
    now,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  }) {
    function summarizeAccounts(accounts) {
      return accounts.reduce(
        (summary, account) => {
          if (account.account_type === "rental") {
            summary.accountCounts.rental += 1;
          } else {
            summary.principal += accountBalance(account);
            if (account.account_type === "land_contract")
              summary.accountCounts.land_contract += 1;
            if (account.account_type === "note")
              summary.accountCounts.note += 1;
          }
          return summary;
        },
        {
          principal: 0,
          accountCounts: { rental: 0, land_contract: 0, note: 0 },
        },
      );
    }

    function buildReportModel(year = now().getFullYear()) {
      const income = sumIncome(
        getPayments().filter(
          (payment) => dateOnly(payment.received_date)?.getFullYear() === year,
        ),
      );
      const costs = sumOperatingExpenses(
        getExpenses().filter(
          (expense) => dateOnly(expense.expense_date)?.getFullYear() === year,
        ),
      );
      const accountSummary = summarizeAccounts(getAccounts());

      return {
        year,
        income,
        costs,
        netCashFlow: income - costs,
        principal: accountSummary.principal,
        accountCounts: accountSummary.accountCounts,
        importBatches: getImportBatches(),
      };
    }

    return Object.freeze({ buildReportModel });
  }

  window.PropertyDeskReportModel = Object.freeze({ create: createReportModel });
})();
