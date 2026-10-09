/* Assemble CSV import rules and event handlers for the workspace. */
(() => {
  "use strict";

  function createImportWorkspaceWorkflow({
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
    workflows,
    validationWorkflow,
    modules,
  }) {
    const { validators } = validationWorkflow.create({
      workflows: {
        csvValueUtils: workflows.csvValueUtils,
        accountImportTerms: workflows.accountImportTerms,
        paymentImportAllocation: workflows.paymentImportAllocation,
        validationApi: workflows.validationApi,
      },
      modules: {
        currencyUtils: modules.currencyUtils,
        domainOptions: modules.domainOptions,
        displayUtils: modules.displayUtils,
        accountValidation: modules.accountValidation,
        importRows: modules.importRows,
        accountImportIdentity: modules.accountImportIdentity,
        emailAddresses: modules.emailAddresses,
        expenseValidation: modules.expenseValidation,
        transactionOptions: modules.transactionOptions,
        expenseAccountPolicy: modules.expenseAccountPolicy,
        paymentValidation: modules.paymentValidation,
      },
    });

    return workflows.feature.create({
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
      modules: {
        importRows: modules.importRows,
        csvParser: modules.csvParser,
        validators,
        preview: modules.preview,
        previewEvents: modules.previewEvents,
        commit: modules.commit,
        review: modules.review,
        accountImport: modules.accountImport,
        accountImportPayload: modules.accountImportPayload,
        csvImportFile: modules.csvImportFile,
        transactionImport: modules.transactionImport,
        paymentImport: modules.paymentImport,
        expenseImport: modules.expenseImport,
        transactionImportWorkflow: modules.transactionImportWorkflow,
      },
    });
  }

  window.PropertyDeskImportWorkspaceWorkflow = Object.freeze({
    create: createImportWorkspaceWorkflow,
  });
})();
