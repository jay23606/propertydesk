/* Compose account and transaction CSV import workflows. */
(() => {
  "use strict";

  function createImportWorkflows(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      createImportLookup,
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
      createImportLookup,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
      createTransactionImportWorkflow:
        window.PropertyDeskTransactionImportWorkflow.create,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $,
      state,
      parseCSV,
      validateExpenseRows,
      commitTransactions,
      importReview,
      createImportLookup,
      createFileWorkflow: window.PropertyDeskCsvImportFile.create,
      createTransactionImportWorkflow:
        window.PropertyDeskTransactionImportWorkflow.create,
    });

    return {
      attachAccountEvents: accounts.attachEvents,
      attachPaymentEvents: payments.attachEvents,
      attachExpenseEvents: expenses.attachEvents,
    };
  }

  window.PropertyDeskImportFeature = Object.freeze({
    create: createImportWorkflows,
  });
})();
