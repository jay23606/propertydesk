/* Compose account and transaction CSV import workflows. */
(() => {
  "use strict";

  function createImportWorkflows(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      validatePaymentRows,
      validateExpenseRows,
      todayIso,
      fetchAll,
      toast,
    } = context;
    const accounts = window.PropertyDeskAccountImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      todayIso,
      fetchAll,
      toast,
    });
    const payments = window.PropertyDeskPaymentImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validatePaymentRows,
      fetchAll,
      toast,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateExpenseRows,
      fetchAll,
      toast,
    });

    function attachEvents() {
      accounts.attachEvents();
      payments.attachEvents();
      expenses.attachEvents();
    }

    return { attachEvents };
  }

  window.PropertyDeskImportFeature = Object.freeze({
    create: createImportWorkflows,
  });
})();
