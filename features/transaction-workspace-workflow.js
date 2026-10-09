/* Compose transaction maintenance, entry forms, and ledger views. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    records,
    ui,
    services,
    workflows: { maintenance: transactionMaintenance, ledger: ledgerWorkflows },
  }) {
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
