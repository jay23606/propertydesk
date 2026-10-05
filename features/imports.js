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
    const transactions = window.PropertyDeskTransactionImports.create({
      $,
      state,
      stageImport,
      parseCSV,
      validatePaymentRows,
      validateExpenseRows,
      fetchAll,
      toast,
    });

    function attachEvents() {
      accounts.attachEvents();
      transactions.attachEvents();
    }

    return {
      importAccounts: accounts.importAccounts,
      importPayments: transactions.importPayments,
      importExpenses: transactions.importExpenses,
      attachEvents,
    };
  }

  window.PropertyDeskImportFeature = Object.freeze({
    create: createImportWorkflows,
  });
})();
