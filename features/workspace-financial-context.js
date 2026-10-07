/* Compose workspace-wide ledger summaries and deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceFinancialContext({ state, ledger, deposit }) {
    const ledgerContext = window.PropertyDeskLedgerContext.create({
      state,
      ...ledger,
    });
    const depositContext = window.PropertyDeskDepositContext.create({
      state,
      ...deposit,
    });

    return {
      accountBalance: ledgerContext.accountBalance,
      scheduledMonthlyRunRate: ledgerContext.scheduledMonthlyRunRate,
      collectedSince: ledgerContext.collectedSince,
      depositLedger: depositContext.depositLedger,
    };
  }

  window.PropertyDeskWorkspaceFinancialContext = Object.freeze({
    create: createWorkspaceFinancialContext,
  });
})();
