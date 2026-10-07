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

    return {
      editAccount: entry.editAccount,
      openAccountForProperty: entry.openAccountForProperty,
      openPayment: entry.openPayment,
      openPropertyPayment: entry.openPropertyPayment,
      openExpense: entry.openExpense,
      attachPropertyFormEvents: entry.attachPropertyFormEvents,
      attachAccountFormEvents: entry.attachAccountFormEvents,
      attachLedgerEntryFormEvents: entry.attachLedgerEntryFormEvents,
      attachCreateActionEvents: entry.attachCreateActionEvents,
      renderPayments: screen.renderPayments,
      attachTransactionViewEvents: screen.attachTransactionViewEvents,
      attachTransactionActionEvents: screen.attachTransactionActionEvents,
    };
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
