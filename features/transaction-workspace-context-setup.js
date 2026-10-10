/* Build the scoped record, UI, and service contexts for transaction views. */
(() => {
  "use strict";

  function createTransactionWorkspaceContexts({ records, ui, services }) {
    return Object.freeze({
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
    });
  }

  window.PropertyDeskTransactionWorkspaceContextSetup = Object.freeze({
    create: createTransactionWorkspaceContexts,
  });
})();
