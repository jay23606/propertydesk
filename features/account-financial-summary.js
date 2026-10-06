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
      return {
        unpaidDue: amountDueSince(
          [account],
          payments,
          unpaidDueAccrualStart(),
          todayIso(),
        ),
        loanBalance: hasLoanBalance ? accountBalance(account) : 0,
        hasLoanBalance,
      };
    }

    return { summarizeAccount };
  }

  window.PropertyDeskAccountFinancialSummary = Object.freeze({
    create: createAccountFinancialSummary,
  });
})();
