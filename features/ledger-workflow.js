/* Compose ledger entry forms, transaction history, and delegated row actions. */
(() => {
  "use strict";

  function createLedgerWorkflow({
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
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion,
      expenseAccountPolicy,
      workflows: entryWorkflows,
    },
    views: {
      $: viewQuery,
      getProperties,
      getAccounts,
      getPayments,
      getExpenses,
      dateOnly,
      now,
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
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion,
      expenseAccountPolicy,
      workflows: entryWorkflows,
      modules: workflows.entryForms.modules,
      saveCorrection,
    });
    const transactionViews = workflows.views.create({
      $: viewQuery,
      getProperties,
      getAccounts,
      getPayments,
      getExpenses,
      dateOnly,
      now,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      modules: workflows.views.modules,
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

  window.PropertyDeskLedgerWorkflow = Object.freeze({
    create: createLedgerWorkflow,
  });
})();
