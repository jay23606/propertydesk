/* Compose workspace-wide ledger summaries and deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceFinancialContext({
    state,
    ledger,
    deposit,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
  }) {
    const ledgerContext = window.PropertyDeskLedgerContext.create({
      state,
      ...ledger,
    });
    const depositContext = window.PropertyDeskDepositContext.create({
      state,
      ...deposit,
    });

    const accountSummary = window.PropertyDeskAccountFinancialSummary.create({
      accountBalance: ledgerContext.accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
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
