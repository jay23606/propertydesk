/* Connect transaction entry, maintenance, list rendering, and row actions. */
(() => {
  "use strict";

  function createTransactionRecordsWorkflow({ maintenance, entries, views }) {
    const transactionMaintenance =
      window.PropertyDeskTransactionMaintenanceWorkflow.create(maintenance);
    const ledgerEntryForms = window.PropertyDeskLedgerEntryForms.create({
      ...entries,
      saveCorrection: transactionMaintenance.saveCorrection,
    });
    const transactionViews = window.PropertyDeskTransactionViews.create(views);
    const { attachTransactionActionEvents } =
      transactionMaintenance.createTransactionActionHandlers({
        openPayment: ledgerEntryForms.openPayment,
        openExpense: ledgerEntryForms.openExpense,
        updatePaymentGuidance: ledgerEntryForms.updatePaymentGuidance,
      });

    return {
      attachLedgerEntryFormEvents: ledgerEntryForms.attachLedgerEntryFormEvents,
      attachTransactionActionEvents,
      attachTransactionFilterEvents:
        transactionViews.attachTransactionFilterEvents,
      openExpense: ledgerEntryForms.openExpense,
      openPayment: ledgerEntryForms.openPayment,
      openPropertyPayment: ledgerEntryForms.openPropertyPayment,
      renderPayments: transactionViews.renderPayments,
    };
  }

  window.PropertyDeskTransactionRecordsWorkflow = Object.freeze({
    create: createTransactionRecordsWorkflow,
  });
})();
