/* Compose account and transaction CSV import workflows. */
(() => {
  "use strict";

  function createImportWorkflows({
    $,
    state,
    esc,
    openModal,
    closeModal,
    todayIso,
    fetchAll,
    toast,
    repository,
    writeFeedback,
  }) {
    const { selectImportRows, createImportLookup } =
      window.PropertyDeskImportRows;
    const { parseCSV } = window.PropertyDeskCsvParser;
    const { validateAccountRows, validatePaymentRows, validateExpenseRows } =
      window.PropertyDeskImportWorkflows;
    const importPreview = window.PropertyDeskImportPreview.create({
      $,
      state,
      selectImportRows,
      esc,
      openModal,
    });
    const { attachEvents: attachPreviewEvents } =
      window.PropertyDeskImportPreviewEvents.create({
        $,
        state,
        selectImportRows,
        renderImportPreview: importPreview.renderImportPreview,
        updateImportCommitButton: importPreview.updateImportCommitButton,
        closeModal,
        toast,
      });
    const { commitAccounts, commitTransactions } =
      window.PropertyDeskImportCommit.create({
        state,
        fetchAll,
        status: $("import-status"),
        toast,
        repository,
        writeFeedback,
      });
    const importReview = window.PropertyDeskImportReview.create({
      stageImport: importPreview.stageImport,
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
    const transactions = window.PropertyDeskTransactionImportFeature.create({
      shared: {
        $,
        createImportLookup,
        createFileWorkflow: window.PropertyDeskCsvImportFile.create,
        createTransactionImportWorkflow:
          window.PropertyDeskTransactionImportWorkflow.create,
      },
      payment: {
        state,
        parseCSV,
        validatePaymentRows,
        commitTransactions,
        importReview,
      },
      expense: {
        state,
        parseCSV,
        validateExpenseRows,
        commitTransactions,
        importReview,
      },
    });

    return Object.freeze({
      attachPreviewEvents,
      attachAccountEvents: accounts.attachEvents,
      attachPaymentEvents: transactions.attachPaymentEvents,
      attachExpenseEvents: transactions.attachExpenseEvents,
    });
  }

  window.PropertyDeskImportFeature = Object.freeze({
    create: createImportWorkflows,
  });
})();
