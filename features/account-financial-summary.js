/* Share per-account unpaid-due and estimated-loan calculations across views. */
(() => {
  "use strict";

  function createAccountFinancialSummary({
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
  }) {
    function summarizeAccount(account, payments) {
      const hasLoanBalance = account.account_type !== "rental";
      const unpaidStart = unpaidDueAccrualStart();
      const asOf = todayIso();
      return {
        unpaidDue: amountDueSince([account], payments, unpaidStart, asOf),
        unpaidStart,
        loanBalance: hasLoanBalance ? accountBalance(account) : 0,
        hasLoanBalance,
      };
    }

    return Object.freeze({ summarizeAccount });
  }

  window.PropertyDeskAccountFinancialSummary = Object.freeze({
    create: createAccountFinancialSummary,
  });
})();
