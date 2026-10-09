/* Collect the workflow modules owned by the transaction workspace. */
(() => {
  "use strict";

  function createTransactionWorkspaceModuleCatalog() {
    return Object.freeze({
      workspace: window.PropertyDeskTransactionWorkspaceWorkflow,
      correctionModel: window.PropertyDeskTransactionCorrectionModel,
      maintenance: window.PropertyDeskTransactionMaintenanceWorkflow,
      correction: window.PropertyDeskTransactionCorrectionWorkflow,
      correctionModules: {
        maintenance: window.PropertyDeskTransactionCorrectionMaintenance,
        form: window.PropertyDeskTransactionCorrectionForm,
        view: window.PropertyDeskTransactionCorrectionView,
      },
      voidModel: window.PropertyDeskTransactionVoidModel,
      voidMaintenance: window.PropertyDeskTransactionVoidMaintenance,
      voidEntry: window.PropertyDeskTransactionVoidEntry,
      maintenanceEvents: window.PropertyDeskTransactionMaintenanceEvents,
      ledger: window.PropertyDeskLedgerWorkflow,
      entryForms: {
        create: window.PropertyDeskLedgerEntryForms.create,
        modules: {
          transactionInserts: window.PropertyDeskTransactionInserts,
          saveWorkflow: window.PropertyDeskLedgerEntrySaveWorkflow,
          paymentForm: window.PropertyDeskPaymentEntryForm,
          expenseForm: window.PropertyDeskExpenseEntryForm,
        },
      },
      views: {
        create: window.PropertyDeskTransactionViews.create,
        modules: {
          filterModel: window.PropertyDeskTransactionListFilterModel,
          associationModel: window.PropertyDeskTransactionAssociationModel,
          displayRowModel: window.PropertyDeskTransactionDisplayRowModel,
          listModel: window.PropertyDeskTransactionListModel,
          summaryModel: window.PropertyDeskTransactionSummaryModel,
          rowView: window.PropertyDeskTransactionRowView,
        },
      },
      transactionPayloads: window.PropertyDeskTransactionPayloads,
      expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
      paymentView: window.PropertyDeskPaymentEntryView,
      expenseView: window.PropertyDeskExpenseEntryView,
      propertyPaymentAction: window.PropertyDeskPropertyPaymentAction,
    });
  }

  window.PropertyDeskTransactionWorkspaceModuleCatalog = Object.freeze({
    create: createTransactionWorkspaceModuleCatalog,
  });
})();
