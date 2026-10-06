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
    const references = window.PropertyDeskImportReferences.create();
    const importReview = window.PropertyDeskImportReview.create({
      stageImport,
    });
    const accounts = window.PropertyDeskAccountImport.create({
      $,
      state,
      parseCSV,
      validateAccountRows,
      todayIso,
      buildPayloads: window.PropertyDeskAccountImportPayload.build,
      commitAccounts,
      importReview,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
    });
    const payments = window.PropertyDeskPaymentImport.create({
      $,
      state,
      parseCSV,
      validatePaymentRows,
      commitTransactions,
      importReview,
      references,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $,
      state,
      parseCSV,
      validateExpenseRows,
      commitTransactions,
      importReview,
      references,
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
