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

    return { ...ledgerContext, ...depositContext };
  }

  window.PropertyDeskWorkspaceFinancialContext = Object.freeze({
    create: createWorkspaceFinancialContext,
  });
})();
