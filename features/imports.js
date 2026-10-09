/* Compose account and transaction CSV import workflows. */
(() => {
  "use strict";

  function createImportWorkflows({
    $,
    getWorkspaceOwnerId,
    getImportBatches,
    getAccounts,
    getPayments,
    getExpenses,
    getProperties,
    getPendingImport,
    setPendingImport,
    esc,
    openModal,
    closeModal,
    todayIso,
    fetchAll,
    toast,
    repository,
    refreshWorkspace,
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
      getPendingImport,
      setPendingImport,
      selectImportRows,
      esc,
      openModal,
      modules: modules.preview.modules,
    });
    const { attachEvents: attachPreviewEvents } = previewEvents.create({
      $,
      getPendingImport,
      setPendingImport,
      selectImportRows,
      renderImportPreview: importPreview.renderImportPreview,
      updateImportCommitButton: importPreview.updateImportCommitButton,
      closeModal,
      toast,
    });
    const { commitAccounts, commitTransactions } = commit.create({
      getWorkspaceOwnerId,
      getImportBatches,
      getAccounts,
      getPayments,
      getExpenses,
      fetchAll,
      status: $("import-status"),
      toast,
      repository,
      refreshWorkspace,
      modules: modules.commit.modules,
    });
    const importReview = review.create({
      stageImport: importPreview.stageImport,
    });
    const accounts = accountImport.create({
      $,
      getProperties,
      getAccounts,
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
        getProperties,
        getAccounts,
        getPayments,
        parseCSV,
        validatePaymentRows,
        commitTransactions,
        importReview,
      },
      expense: {
        getProperties,
        getAccounts,
        getExpenses,
        parseCSV,
        validateExpenseRows,
        commitTransactions,
        importReview,
      },
      modules: {
        payment: modules.paymentImport,
        expense: modules.expenseImport,
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
