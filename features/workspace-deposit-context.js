/* Compose workspace-scoped held-deposit calculations. */
(() => {
  "use strict";

  function createWorkspaceDepositContext({
    getDepositEntries,
    getPayments,
    getExpenses,
    postedLedgerUtils,
    workflows,
  }) {
    const depositCalculations = workflows.depositLedger.create({
      isPosted: postedLedgerUtils.isPosted,
    });
    return workflows.depositContext.create({
      getDepositEntries,
      getPayments,
      getExpenses,
      securityDepositBalance: depositCalculations.securityDepositBalance,
    });
  }

  window.PropertyDeskWorkspaceDepositContext = Object.freeze({
    create: createWorkspaceDepositContext,
  });
})();
