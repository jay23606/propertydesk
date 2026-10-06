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
    const { commitAccounts, commitTransactions } =
      window.PropertyDeskImportCommit.create({
        state,
        fetchAll,
        status: $("import-status"),
        toast,
      });
    const accounts = window.PropertyDeskAccountImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      todayIso,
      buildPayloads: window.PropertyDeskAccountImportPayload.build,
      commitAccounts,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
    });
    const payments = window.PropertyDeskPaymentImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validatePaymentRows,
      commitTransactions,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateExpenseRows,
      commitTransactions,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
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
