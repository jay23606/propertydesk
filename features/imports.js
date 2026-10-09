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
    modules,
  }) {
    const {
      importRows,
      csvParser,
      validators,
      preview,
      previewEvents,
      commit,
      review,
      accountImport,
      accountImportPayload,
      csvImportFile,
      transactionImport,
      transactionImportWorkflow,
    } = modules;
    const { selectImportRows, createImportLookup } = importRows;
    const { parseCSV } = csvParser;
    const { validateAccountRows, validatePaymentRows, validateExpenseRows } =
      validators;
    const importPreview = preview.create({
      $,
      state,
      selectImportRows,
      esc,
      openModal,
      modules: modules.preview.modules,
    });
    const { attachEvents: attachPreviewEvents } = previewEvents.create({
      $,
      state,
      selectImportRows,
      renderImportPreview: importPreview.renderImportPreview,
      updateImportCommitButton: importPreview.updateImportCommitButton,
      closeModal,
      toast,
    });
    const { commitAccounts, commitTransactions } = commit.create({
      state,
      fetchAll,
      status: $("import-status"),
      toast,
      repository,
      writeFeedback,
      modules: modules.commit.modules,
    });
    const importReview = review.create({
      stageImport: importPreview.stageImport,
    });
    const accounts = accountImport.create({
      $,
      state,
      parseCSV,
      validateAccountRows,
      todayIso,
      buildPayloads: accountImportPayload.build,
      commitAccounts,
      importReview,
      createFileWorkflow: csvImportFile.create,
    });
    const transactions = transactionImport.create({
      shared: {
        $,
        createImportLookup,
        createFileWorkflow: csvImportFile.create,
        createTransactionImportWorkflow: transactionImportWorkflow.create,
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
