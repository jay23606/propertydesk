/* Group payment and expense CSV imports behind one transaction boundary. */
(() => {
  "use strict";

  function createTransactionImportFeature({ shared, payment, expense }) {
    const payments = window.PropertyDeskPaymentImport.create({
      ...shared,
      ...payment,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      ...shared,
      ...expense,
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
