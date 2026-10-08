/* Compose workspace account-balance and due summaries. */
(() => {
  "use strict";

  function createWorkspaceAccountFinancialContext({
    state,
    ledger,
    amountDueSince,
    unpaidDueAccrualStart,
    workflows,
  }) {
    const ledgerContext = workflows.ledger.create({
      state,
      todayIso: ledger.todayIso,
      scheduledLoanBalance: ledger.scheduledLoanBalance,
      monthlyScheduledEstimate: ledger.monthlyScheduledEstimate,
      postedOnOrAfter: ledger.postedOnOrAfter,
      sumPosted: ledger.sumPosted,
    });
    const accountSummary = workflows.accountSummary.create({
      accountBalance: ledgerContext.accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso: ledger.todayIso,
    });

    return Object.freeze({
      accountBalance: ledgerContext.accountBalance,
      scheduledMonthlyRunRate: ledgerContext.scheduledMonthlyRunRate,
      collectedSince: ledgerContext.collectedSince,
      summarizeAccount: accountSummary.summarizeAccount,
    });
  }

  window.PropertyDeskWorkspaceAccountFinancialContext = Object.freeze({
    create: createWorkspaceAccountFinancialContext,
  });
})();
