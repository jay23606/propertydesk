/* Group payment and expense CSV imports behind one transaction boundary. */
(() => {
  "use strict";

  function createTransactionImportFeature({ shared, payment, expense }) {
    const payments = window.PropertyDeskPaymentImport.create({
      $: shared.$,
      createImportLookup: shared.createImportLookup,
      createFileWorkflow: shared.createFileWorkflow,
      createTransactionImportWorkflow: shared.createTransactionImportWorkflow,
      state: payment.state,
      parseCSV: payment.parseCSV,
      validatePaymentRows: payment.validatePaymentRows,
      commitTransactions: payment.commitTransactions,
      importReview: payment.importReview,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $: shared.$,
      createImportLookup: shared.createImportLookup,
      createFileWorkflow: shared.createFileWorkflow,
      createTransactionImportWorkflow: shared.createTransactionImportWorkflow,
      state: expense.state,
      parseCSV: expense.parseCSV,
      validateExpenseRows: expense.validateExpenseRows,
      commitTransactions: expense.commitTransactions,
      importReview: expense.importReview,
    });

    return {
      attachPaymentEvents: payments.attachEvents,
      attachExpenseEvents: expenses.attachEvents,
    };
  }

  window.PropertyDeskTransactionImportFeature = Object.freeze({
    create: createTransactionImportFeature,
  });
})();
