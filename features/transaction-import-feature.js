/* Group payment and expense CSV imports behind one transaction boundary. */
(() => {
  "use strict";

  function createTransactionImportFeature({
    shared,
    payment,
    expense,
    modules,
  }) {
    const payments = modules.payment.create({
      $: shared.$,
      createImportLookup: shared.createImportLookup,
      createFileWorkflow: shared.createFileWorkflow,
      createTransactionImportWorkflow: shared.createTransactionImportWorkflow,
      getProperties: payment.getProperties,
      getAccounts: payment.getAccounts,
      getPayments: payment.getPayments,
      parseCSV: payment.parseCSV,
      validatePaymentRows: payment.validatePaymentRows,
      commitTransactions: payment.commitTransactions,
      importReview: payment.importReview,
    });
    const expenses = modules.expense.create({
      $: shared.$,
      createImportLookup: shared.createImportLookup,
      createFileWorkflow: shared.createFileWorkflow,
      createTransactionImportWorkflow: shared.createTransactionImportWorkflow,
      getProperties: expense.getProperties,
      getAccounts: expense.getAccounts,
      getExpenses: expense.getExpenses,
      parseCSV: expense.parseCSV,
      validateExpenseRows: expense.validateExpenseRows,
      commitTransactions: expense.commitTransactions,
      importReview: expense.importReview,
    });

    return Object.freeze({
      attachPaymentEvents: payments.attachEvents,
      attachExpenseEvents: expenses.attachEvents,
    });
  }

  window.PropertyDeskTransactionImportFeature = Object.freeze({
    create: createTransactionImportFeature,
  });
})();
