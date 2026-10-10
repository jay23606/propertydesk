/* Connect workspace state, ledger services, and child workflows to the transaction workspace. */
(() => {
  "use strict";

  function createTransactionWorkspaceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    const contexts = workflows.contextSetup.create({ records, ui, services });
    const transactionMaintenance = workflows.maintenanceSetup.create({
      records: {
        getAccounts: records.getAccounts,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        getPendingCorrection: records.getPendingCorrection,
        setPendingCorrection: records.setPendingCorrection,
      },
      ui: {
        $: ui.$,
        toast: ui.toast,
        closeModal: ui.closeModal,
        prettyType: ui.prettyType,
        promptAction: ui.promptAction,
        confirmAction: ui.confirmAction,
        transactionTimestamp: ui.transactionTimestamp,
        EventClass: ui.EventClass,
        OptionClass: ui.OptionClass,
        documentRef: ui.documentRef,
      },
      services: {
        fetchAll: services.fetchAll,
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        transactionRepository: {
          correct: services.transactionRepository.correct,
          voidPosted: services.transactionRepository.voidPosted,
        },
      },
      workflows: {
        maintenance: workflows.maintenance,
        correctionModel: workflows.correctionModel,
        correction: workflows.correction,
        correctionModules: workflows.correctionModules,
        voidModel: workflows.voidModel,
        voidMaintenance: workflows.voidMaintenance,
        voidEntry: workflows.voidEntry,
        maintenanceEvents: workflows.maintenanceEvents,
      },
    });

    return workflows.workspace.create({
      ...contexts,
      workflows: {
        maintenance: transactionMaintenance,
        ledger: {
          workflow: workflows.ledger,
          entryForms: workflows.entryForms,
          views: workflows.views,
          transactionPayloads: workflows.transactionPayloads,
          expenseAccountPolicy: workflows.expenseAccountPolicy,
          paymentView: workflows.paymentView,
          expenseView: workflows.expenseView,
          propertyPaymentAction: workflows.propertyPaymentAction,
        },
      },
    });
  }

  window.PropertyDeskTransactionWorkspaceSetup = Object.freeze({
    create: createTransactionWorkspaceSetup,
  });
})();
