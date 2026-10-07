/* Compose workspace-wide ledger summaries and deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceFinancialContext({
    state,
    ledger,
    deposit,
    amountDueSince,
    unpaidDueAccrualStart,
  }) {
    const ledgerContext = window.PropertyDeskLedgerContext.create({
      state,
      todayIso: ledger.todayIso,
      scheduledLoanBalance: ledger.scheduledLoanBalance,
      monthlyScheduledEstimate: ledger.monthlyScheduledEstimate,
      postedOnOrAfter: ledger.postedOnOrAfter,
      sumPosted: ledger.sumPosted,
    });
    const depositContext = window.PropertyDeskDepositContext.create({
      state,
      securityDepositBalance: deposit.securityDepositBalance,
    });

    const accountSummary = window.PropertyDeskAccountFinancialSummary.create({
      accountBalance: ledgerContext.accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso: ledger.todayIso,
    });

    return {
      accountBalance: ledgerContext.accountBalance,
      scheduledMonthlyRunRate: ledgerContext.scheduledMonthlyRunRate,
      collectedSince: ledgerContext.collectedSince,
      depositLedger: depositContext.depositLedger,
      summarizeAccount: accountSummary.summarizeAccount,
    };
  }

  window.PropertyDeskWorkspaceFinancialContext = Object.freeze({
    create: createWorkspaceFinancialContext,
  });
})();
