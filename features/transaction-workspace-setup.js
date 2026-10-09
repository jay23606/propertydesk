/* Connect workspace state, ledger services, and child workflows to the transaction workspace. */
(() => {
  "use strict";

  function createTransactionWorkspaceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    const transactionMaintenance = workflows.maintenance.create({
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

    return workflows.workspace.create({
      records: {
        getProperties: records.getProperties,
        getAccounts: records.getAccounts,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        getPendingCorrection: records.getPendingCorrection,
        setPendingCorrection: records.setPendingCorrection,
      },
      ui: {
        $: ui.$,
        toast: ui.toast,
        closeModal: ui.closeModal,
        openModal: ui.openModal,
        promptAction: ui.promptAction,
        confirmAction: ui.confirmAction,
        EventClass: ui.EventClass,
        OptionClass: ui.OptionClass,
        transactionTimestamp: ui.transactionTimestamp,
        moneyInput: ui.moneyInput,
        todayIso: ui.todayIso,
        fillSelect: ui.fillSelect,
        populateFormOptions: ui.populateFormOptions,
        prettyType: ui.prettyType,
        dateOnly: ui.dateOnly,
        now: ui.now,
        fmtDate: ui.fmtDate,
        esc: ui.esc,
        expenseCategoryLabel: ui.expenseCategoryLabel,
        money: ui.money,
        monthStart: ui.monthStart,
        documentRef: ui.documentRef,
      },
      services: {
        fetchAll: services.fetchAll,
        transactionRepository: {
          insertPayment: services.transactionRepository.insertPayment,
          insertExpense: services.transactionRepository.insertExpense,
        },
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion: services.selectRecordWriteCompletion,
        postedOnOrAfter: services.postedOnOrAfter,
        sumIncome: services.sumIncome,
        sumOperatingExpenses: services.sumOperatingExpenses,
      },
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
