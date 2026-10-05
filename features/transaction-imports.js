/* Compose payment and expense CSV import workflows. */
(() => {
  "use strict";

  function createTransactionImports(context) {
    const payments = window.PropertyDeskPaymentImport.create(context);
    const expenses = window.PropertyDeskExpenseImport.create(context);

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
