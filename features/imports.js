/* Compose account and transaction CSV import workflows. */
(() => {
  "use strict";

  function createImportWorkflows(context) {
    const accounts = window.PropertyDeskAccountImport.create(context);
    const transactions = window.PropertyDeskTransactionImports.create(context);

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
