/* Connect transaction entry, maintenance, list rendering, and row actions. */
(() => {
  "use strict";

  function createTransactionRecordsWorkflow({
    maintenance,
    workflows,
    entries: {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      transactionRepository,
      transactionPayloads,
      writeFeedback,
      selectRecordWriteCompletion,
      expenseAccountPolicy,
      workflows: entryWorkflows,
    },
    views: {
      $: viewQuery,
      state: viewState,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    },
  }) {
    const { saveCorrection, createTransactionActionHandlers } = maintenance;
    const ledgerEntryForms = workflows.entryForms.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      transactionRepository,
      transactionPayloads,
      writeFeedback,
      selectRecordWriteCompletion,
      expenseAccountPolicy,
      workflows: entryWorkflows,
      saveCorrection,
    });
    const transactionViews = workflows.views.create({
      $: viewQuery,
      state: viewState,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });
    const { attachTransactionActionEvents } = createTransactionActionHandlers({
      openPayment: ledgerEntryForms.openPayment,
      openExpense: ledgerEntryForms.openExpense,
      updatePaymentGuidance: ledgerEntryForms.updatePaymentGuidance,
    });

    return Object.freeze({
      attachLedgerEntryFormEvents: ledgerEntryForms.attachLedgerEntryFormEvents,
      attachTransactionActionEvents,
      attachTransactionFilterEvents:
        transactionViews.attachTransactionFilterEvents,
      openExpense: ledgerEntryForms.openExpense,
      openPayment: ledgerEntryForms.openPayment,
      openPropertyPayment: ledgerEntryForms.openPropertyPayment,
      renderPayments: transactionViews.renderPayments,
    });
  }

  window.PropertyDeskTransactionRecordsWorkflow = Object.freeze({
    create: createTransactionRecordsWorkflow,
  });
})();
