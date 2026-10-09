/* Connect import workspace accessors, UI services, and validation modules. */
(() => {
  "use strict";

  function createImportWorkspaceSetup({ records, ui, services, workflows }) {
    return workflows.imports.create({
      $: ui.$,
      getWorkspaceOwnerId: records.getWorkspaceOwnerId,
      getImportBatches: records.getImportBatches,
      getAccounts: records.getAccounts,
      getPayments: records.getPayments,
      getExpenses: records.getExpenses,
      getProperties: records.getProperties,
      getPendingImport: records.getPendingImport,
      setPendingImport: records.setPendingImport,
      esc: ui.esc,
      openModal: ui.openModal,
      closeModal: ui.closeModal,
      todayIso: ui.todayIso,
      fetchAll: services.fetchAll,
      toast: ui.toast,
      repository: services.repository,
      refreshWorkspace: services.refreshWorkspace,
      workflows: {
        csvValueUtils: workflows.csvValueUtils,
        accountImportTerms: workflows.accountImportTerms,
        paymentImportAllocation: workflows.paymentImportAllocation,
        validationApi: workflows.validationApi,
        feature: workflows.feature,
      },
      validationWorkflow: workflows.validation,
      modules: workflows.modules,
    });
  }

  window.PropertyDeskImportWorkspaceSetup = Object.freeze({
    create: createImportWorkspaceSetup,
  });
})();
