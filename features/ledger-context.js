/* Shared ledger calculations over the loaded PropertyDesk workspace state. */
(() => {
  "use strict";

  function create({
    state,
    todayIso,
    scheduledLoanBalance,
    monthlyScheduledEstimate,
    sumPosted,
    securityDepositBalance,
  }) {
    function accountBalance(account, asOf = todayIso()) {
      return scheduledLoanBalance(account, asOf);
    }

    function scheduledMonthlyRunRate() {
      return monthlyScheduledEstimate(state.accounts);
    }

    function collectedSince(date) {
      const payments = state.payments.filter(
        (payment) => String(payment.received_date) >= date,
      );
      return sumPosted(payments);
    }

    function depositLedger(accountId) {
      const entries = state.depositEntries.filter(
        (row) => row.account_id === accountId,
      );
      const result = securityDepositBalance(
        entries,
        state.payments,
        state.expenses,
      );
      return { ...result, entries };
    }

    return {
      accountBalance,
      scheduledMonthlyRunRate,
      collectedSince,
      depositLedger,
    };
  }

  window.PropertyDeskLedgerContext = Object.freeze({ create });
})();
