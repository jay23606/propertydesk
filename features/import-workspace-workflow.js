/* Assemble CSV import rules and event handlers for the workspace. */
(() => {
  "use strict";

  function createImportWorkspaceWorkflow({
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
    workflows,
    modules,
  }) {
    const csvValueUtils = workflows.csvValueUtils.create({
      modules: { currencyUtils: modules.currencyUtils },
    });
    const accountImportTerms = workflows.accountImportTerms.create({
      modules: {
        csvValueUtils,
        domainOptions: modules.domainOptions,
      },
    });
    const paymentImportAllocation = workflows.paymentImportAllocation.create({
      modules: {
        csvValueUtils,
        currencyUtils: modules.currencyUtils,
        displayUtils: modules.displayUtils,
      },
    });
    const validators = workflows.validationApi.create({
      account: {
        validator: modules.accountValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          identity: modules.accountImportIdentity,
          domainOptions: modules.domainOptions,
          terms: accountImportTerms,
          emailAddresses: modules.emailAddresses,
        },
      },
      expense: {
        validator: modules.expenseValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          transactionOptions: modules.transactionOptions,
          expenseAccountPolicy: modules.expenseAccountPolicy,
        },
      },
      payment: {
        validator: modules.paymentValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          paymentAllocation: paymentImportAllocation,
          transactionOptions: modules.transactionOptions,
        },
      },
    });

    return workflows.feature.create({
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
