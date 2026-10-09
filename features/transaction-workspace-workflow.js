/* Compose transaction maintenance, entry forms, and ledger views. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    records,
    ui,
    services,
    workflows: { maintenance: maintenanceWorkflows, ledger: ledgerWorkflows },
  }) {
    const transactionMaintenance = maintenanceWorkflows.workflow.create({
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
        resolveVoidTarget: maintenanceWorkflows.voidModel.resolveVoidTarget,
        buildVoidPayload: maintenanceWorkflows.voidModel.buildVoidPayload,
      },
      events: { documentRef: ui.documentRef },
      workflows: {
        correctionModel: maintenanceWorkflows.correctionModel,
        correction: maintenanceWorkflows.correction,
        correctionModules: maintenanceWorkflows.correctionModules,
        voidMaintenance: maintenanceWorkflows.voidMaintenance,
        voidEntry: maintenanceWorkflows.voidEntry,
        events: maintenanceWorkflows.events,
      },
    });

    return ledgerWorkflows.workflow.create({
      saveCorrection: transactionMaintenance.saveCorrection,
      createTransactionActionHandlers:
        transactionMaintenance.createTransactionActionHandlers,
      workflows: {
        entryForms: {
          create: ledgerWorkflows.entryForms.create,
          modules: ledgerWorkflows.entryForms.modules,
        },
        views: {
          create: ledgerWorkflows.views.create,
          modules: ledgerWorkflows.views.modules,
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
        transactionRepository: {
          insertPayment: services.transactionRepository.insertPayment,
          insertExpense: services.transactionRepository.insertExpense,
        },
        transactionPayloads: ledgerWorkflows.transactionPayloads,
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion: services.selectRecordWriteCompletion,
        expenseAccountPolicy: ledgerWorkflows.expenseAccountPolicy,
        workflows: {
          paymentView: ledgerWorkflows.paymentView,
          expenseView: ledgerWorkflows.expenseView,
          propertyPaymentAction: ledgerWorkflows.propertyPaymentAction,
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
