/* Wire scoped workspace dependencies into transaction maintenance actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    return workflows.maintenance.create({
      correction: {
        $: ui.$,
        getAccounts: records.getAccounts,
        getPendingCorrection: records.getPendingCorrection,
        setPendingCorrection: records.setPendingCorrection,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        closeModal: ui.closeModal,
        prettyType: ui.prettyType,
        promptAction: ui.promptAction,
        EventClass: ui.EventClass,
        OptionClass: ui.OptionClass,
        repository: {
          correct: services.transactionRepository.correct,
        },
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
      },
      voiding: {
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        timestamp: ui.transactionTimestamp,
        confirmAction: ui.confirmAction,
        promptAction: ui.promptAction,
        repository: {
          voidPosted: services.transactionRepository.voidPosted,
        },
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        resolveVoidTarget: workflows.voidModel.resolveVoidTarget,
        buildVoidPayload: workflows.voidModel.buildVoidPayload,
      },
      events: { documentRef: ui.documentRef },
      workflows: {
        correctionModel: workflows.correctionModel,
        correction: workflows.correction,
        correctionModules: workflows.correctionModules,
        voidMaintenance: workflows.voidMaintenance,
        voidEntry: workflows.voidEntry,
        events: workflows.maintenanceEvents,
      },
    });
  }

  window.PropertyDeskTransactionMaintenanceSetup = Object.freeze({
    create: createTransactionMaintenanceSetup,
  });
})();
