/* Connect workspace state, ledger services, and child workflows to the transaction workspace. */
(() => {
  "use strict";

  function createTransactionWorkspaceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
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
        transactionRepository: services.transactionRepository,
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion: services.selectRecordWriteCompletion,
        postedOnOrAfter: services.postedOnOrAfter,
        sumIncome: services.sumIncome,
        sumOperatingExpenses: services.sumOperatingExpenses,
      },
      workflows: {
        correctionModel: workflows.correctionModel,
        maintenance: workflows.maintenance,
        correction: workflows.correction,
        correctionModules: workflows.correctionModules,
        voidModel: workflows.voidModel,
        voidMaintenance: workflows.voidMaintenance,
        voidEntry: workflows.voidEntry,
        maintenanceEvents: workflows.maintenanceEvents,
        ledger: workflows.ledger,
        entryForms: workflows.entryForms,
        views: workflows.views,
        transactionPayloads: workflows.transactionPayloads,
        expenseAccountPolicy: workflows.expenseAccountPolicy,
        paymentView: workflows.paymentView,
        expenseView: workflows.expenseView,
        propertyPaymentAction: workflows.propertyPaymentAction,
      },
    });
  }

  window.PropertyDeskTransactionWorkspaceSetup = Object.freeze({
    create: createTransactionWorkspaceSetup,
  });
})();
