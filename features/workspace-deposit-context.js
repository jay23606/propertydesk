/* Compose workspace-scoped held-deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceDepositContext({ state, postedLedgerUtils }) {
    const depositCalculations = window.PropertyDeskDepositLedgerUtils.create({
      isPosted: postedLedgerUtils.isPosted,
    });
    return window.PropertyDeskDepositContext.create({
      state,
      securityDepositBalance: depositCalculations.securityDepositBalance,
    });
  }

  window.PropertyDeskWorkspaceDepositContext = Object.freeze({
    create: createWorkspaceDepositContext,
  });
})();
