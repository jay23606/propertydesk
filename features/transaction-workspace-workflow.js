/* Connect correction persistence, payment entry, and transaction history. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    maintenance: maintenanceContext,
    entry: entryContext,
    screen: screenContext,
  }) {
    const maintenance =
      window.PropertyDeskTransactionMaintenanceWorkflow.create(
        maintenanceContext,
      );
    const entry = window.PropertyDeskRecordEntryWorkflow.create({
      ...entryContext,
      saveCorrection: maintenance.saveCorrection,
    });
    const screen = window.PropertyDeskTransactionScreenWorkflow.create({
      ...screenContext,
      transactionMaintenance: maintenance,
      openPayment: entry.openPayment,
      openExpense: entry.openExpense,
      updatePaymentGuidance: entry.updatePaymentGuidance,
    });

    return { ...entry, ...screen };
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
