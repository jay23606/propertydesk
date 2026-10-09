/* Scope held-deposit calculations to the active workspace state. */
(() => {
  "use strict";

  function create({
    getDepositEntries,
    getPayments,
    getExpenses,
    securityDepositBalance,
  }) {
    function depositLedger(accountId) {
      const entries = getDepositEntries().filter(
        (row) => row.account_id === accountId,
      );
      const result = securityDepositBalance(
        entries,
        getPayments(),
        getExpenses(),
      );
      return {
        active: result.active,
        totals: result.totals,
        entries,
        paymentById: result.paymentById,
        expenseById: result.expenseById,
      };
    }

    return Object.freeze({ depositLedger });
  }

  window.PropertyDeskDepositContext = Object.freeze({ create });
})();
