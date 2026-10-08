/* Scope held-deposit calculations to the active workspace state. */
(() => {
  "use strict";

  function create({ state, securityDepositBalance }) {
    function depositLedger(accountId) {
      const entries = state.depositEntries.filter(
        (row) => row.account_id === accountId,
      );
      const result = securityDepositBalance(
        entries,
        state.payments,
        state.expenses,
      );
      return { active: result.active, totals: result.totals, entries };
    }

    return Object.freeze({ depositLedger });
  }

  window.PropertyDeskDepositContext = Object.freeze({ create });
})();
