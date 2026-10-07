/* Connect correction persistence, payment entry, and transaction history. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    maintenance: maintenanceContext,
    entry: entryContext,
    screen: screenContext,
  }) {
    const maintenance =
      window.PropertyDeskTransactionMaintenanceWorkflow.create(
        maintenanceContext,
      );
    const entry = window.PropertyDeskRecordEntryWorkflow.create({
      $: entryContext.$,
      state: entryContext.state,
      moneyInput: entryContext.moneyInput,
      todayIso: entryContext.todayIso,
      toast: entryContext.toast,
      closeModal: entryContext.closeModal,
      fetchAll: entryContext.fetchAll,
      fillSelect: entryContext.fillSelect,
      populateFormOptions: entryContext.populateFormOptions,
      prettyType: entryContext.prettyType,
      openModal: entryContext.openModal,
      previewReminderEmail: entryContext.previewReminderEmail,
      navigate: entryContext.navigate,
      documentRef: entryContext.documentRef,
      saveCorrection: maintenance.saveCorrection,
    });
    const screen = window.PropertyDeskTransactionScreenWorkflow.create({
      $: screenContext.$,
      state: screenContext.state,
      dateOnly: screenContext.dateOnly,
      fmtDate: screenContext.fmtDate,
      esc: screenContext.esc,
      expenseCategoryLabel: screenContext.expenseCategoryLabel,
      money: screenContext.money,
      postedOnOrAfter: screenContext.postedOnOrAfter,
      monthStart: screenContext.monthStart,
      sumIncome: screenContext.sumIncome,
      sumOperatingExpenses: screenContext.sumOperatingExpenses,
      transactionMaintenance: maintenance,
      openPayment: entry.openPayment,
      openExpense: entry.openExpense,
      updatePaymentGuidance: entry.updatePaymentGuidance,
    });

    return {
      editAccount: entry.editAccount,
      openAccountForProperty: entry.openAccountForProperty,
      openPayment: entry.openPayment,
      openPropertyPayment: entry.openPropertyPayment,
      openExpense: entry.openExpense,
      attachPropertyFormEvents: entry.attachPropertyFormEvents,
      attachAccountFormEvents: entry.attachAccountFormEvents,
      attachLedgerEntryFormEvents: entry.attachLedgerEntryFormEvents,
      attachCreateActionEvents: entry.attachCreateActionEvents,
      renderPayments: screen.renderPayments,
      attachTransactionViewEvents: screen.attachTransactionViewEvents,
      attachTransactionActionEvents: screen.attachTransactionActionEvents,
    };
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
