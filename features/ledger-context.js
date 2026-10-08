/* Shared ledger calculations over the loaded PropertyDesk workspace state. */
(() => {
  "use strict";

  function create({
    state,
    todayIso,
    scheduledLoanBalance,
    monthlyScheduledEstimate,
    postedOnOrAfter,
    sumPosted,
  }) {
    function accountBalance(account, asOf = todayIso()) {
      return scheduledLoanBalance(account, asOf);
    }

    function scheduledMonthlyRunRate() {
      return monthlyScheduledEstimate(state.accounts);
    }

    function collectedSince(date) {
      const payments = postedOnOrAfter(state.payments, "received_date", date);
      return sumPosted(payments);
    }

    return Object.freeze({
      accountBalance,
      scheduledMonthlyRunRate,
      collectedSince,
    });
  }

  window.PropertyDeskLedgerContext = Object.freeze({ create });
})();
