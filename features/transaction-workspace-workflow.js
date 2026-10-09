/* Compose transaction maintenance, entry forms, and ledger views. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    records,
    ui,
    services,
    workflows,
  }) {
    const transactionCorrectionModel = workflows.correctionModel.create({
      getPayments: records.getPayments,
      getExpenses: records.getExpenses,
      getAccounts: records.getAccounts,
    });
    const transactionMaintenance = workflows.maintenance.create({
      correction: {
        $: ui.$,
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
        repository: services.transactionRepository,
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        findCorrectionTarget: transactionCorrectionModel.findCorrectionTarget,
      },
      voiding: {
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        timestamp: ui.transactionTimestamp,
        confirmAction: ui.confirmAction,
        promptAction: ui.promptAction,
        repository: services.transactionRepository,
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        resolveVoidTarget: workflows.voidModel.resolveVoidTarget,
        buildVoidPayload: workflows.voidModel.buildVoidPayload,
      },
      events: { documentRef: ui.documentRef },
      workflows: {
        correction: workflows.correction,
        correctionModules: workflows.correctionModules,
        voidMaintenance: workflows.voidMaintenance,
        voidEntry: workflows.voidEntry,
        events: workflows.maintenanceEvents,
      },
    });

    return workflows.ledger.create({
      maintenance: transactionMaintenance,
      workflows: {
        entryForms: {
          create: workflows.entryForms.create,
          modules: workflows.entryForms.modules,
        },
        views: {
          create: workflows.views.create,
          modules: workflows.views.modules,
        },
      },
      entries: {
        $: ui.$,
        getAccounts: records.getAccounts,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        getPendingCorrection: records.getPendingCorrection,
        setPendingCorrection: records.setPendingCorrection,
        moneyInput: ui.moneyInput,
        todayIso: ui.todayIso,
        toast: ui.toast,
        closeModal: ui.closeModal,
        fetchAll: services.fetchAll,
        fillSelect: ui.fillSelect,
        populateFormOptions: ui.populateFormOptions,
        prettyType: ui.prettyType,
        openModal: ui.openModal,
        transactionRepository: services.transactionRepository,
        transactionPayloads: workflows.transactionPayloads,
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion: services.selectRecordWriteCompletion,
        expenseAccountPolicy: workflows.expenseAccountPolicy,
        workflows: {
          paymentView: workflows.paymentView,
          expenseView: workflows.expenseView,
          propertyPaymentAction: workflows.propertyPaymentAction,
        },
      },
      views: {
        $: ui.$,
        getProperties: records.getProperties,
        getAccounts: records.getAccounts,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        dateOnly: ui.dateOnly,
        now: ui.now,
        fmtDate: ui.fmtDate,
        esc: ui.esc,
        expenseCategoryLabel: ui.expenseCategoryLabel,
        money: ui.money,
        postedOnOrAfter: services.postedOnOrAfter,
        monthStart: ui.monthStart,
        sumIncome: services.sumIncome,
        sumOperatingExpenses: services.sumOperatingExpenses,
      },
    });
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
