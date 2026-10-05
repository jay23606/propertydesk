/* Compose payment and expense CSV import workflows. */
(() => {
  "use strict";

  function createTransactionImports(context) {
    const {
      $, state, stageImport, parseCSV, validatePaymentRows,
      validateExpenseRows, fetchAll, toast,
    } = context;
    const payments = window.PropertyDeskPaymentImport.create({
      $, state, stageImport, parseCSV, validatePaymentRows, fetchAll, toast,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $, state, stageImport, parseCSV, validateExpenseRows, fetchAll, toast,
    });

    function attachEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    return {
      importPayments: payments.importPayments,
      importExpenses: expenses.importExpenses,
      attachEvents,
    };
  }

  window.PropertyDeskTransactionImports = Object.freeze({
    create: createTransactionImports,
  });
})();
