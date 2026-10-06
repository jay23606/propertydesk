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
    const commitTransactionImport =
      window.PropertyDeskTransactionImportCommit.create({
        state,
        fetchAll,
        status: $("import-status"),
        toast,
      }).commit;
    const accounts = window.PropertyDeskAccountImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      todayIso,
      fetchAll,
      toast,
      buildPayloads: window.PropertyDeskAccountImportPayload.build,
    });
    const payments = window.PropertyDeskPaymentImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validatePaymentRows,
      commitTransactionImport,
    });
    const expenses = window.PropertyDeskExpenseImport.create({
      $,
      state,
      stageImport,
      parseCSV,
      validateExpenseRows,
      commitTransactionImport,
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
