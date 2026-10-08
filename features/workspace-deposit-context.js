/* Compose workspace-scoped held-deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceDepositContext({
    state,
    postedLedgerUtils,
    workflows,
  }) {
    const depositCalculations = workflows.depositLedger.create({
      isPosted: postedLedgerUtils.isPosted,
    });
    return workflows.depositContext.create({
      state,
      securityDepositBalance: depositCalculations.securityDepositBalance,
    });
  }

  window.PropertyDeskWorkspaceDepositContext = Object.freeze({
    create: createWorkspaceDepositContext,
  });
})();
