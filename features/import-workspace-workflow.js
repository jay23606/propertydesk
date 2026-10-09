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
    validationWorkflow,
    modules,
  }) {
    const { validators } = validationWorkflow.create({ workflows, modules });

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
