/* Shared ledger calculations over the loaded PropertyDesk workspace state. */
(() => {
  "use strict";

  function create({
    getAccounts,
    getPayments,
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
      return monthlyScheduledEstimate(getAccounts());
    }

    function collectedSince(date) {
      const payments = postedOnOrAfter(getPayments(), "received_date", date);
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
