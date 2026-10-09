/* Compose the separate receipt and property-expense entry workflows. */
(() => {
  "use strict";

  function createLedgerEntryForms({
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
    saveCorrection,
    transactionPayloads,
    transactionRepository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
    expenseAccountPolicy,
    workflows,
    modules,
  }) {
    const {
      buildPayment,
      buildExpense,
      buildPaymentCorrection,
      buildExpenseCorrection,
    } = transactionPayloads;
    const { insertPayment, insertExpense } = modules.transactionInserts.create({
      getCollection: (collection) =>
        collection === "payments"
          ? state.payments
          : collection === "expenses"
            ? state.expenses
            : null,
      fetchAll,
      toast,
      repository: transactionRepository,
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion,
    });
    const { saveTransactionEntry } = modules.saveWorkflow.create({
      $,
      state,
      saveCorrection,
      closeModal,
      toast,
    });
    const payments = modules.paymentForm.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      workflows: {
        view: workflows.paymentView,
        propertyPaymentAction: workflows.propertyPaymentAction,
      },
      saveTransactionEntry,
      insertPayment,
      buildPaymentPayload: buildPayment,
      buildPaymentCorrection,
    });
    const expenses = modules.expenseForm.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      saveTransactionEntry,
      insertExpense,
      expenseAccountPolicy,
      workflows: { view: workflows.expenseView },
      buildExpensePayload: buildExpense,
      buildExpenseCorrection,
    });

    function attachLedgerEntryFormEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    // Keep only app-level actions; submit handlers stay inside their forms.
    return Object.freeze({
      updatePaymentGuidance: payments.updatePaymentGuidance,
      openPayment: payments.openPayment,
      openPropertyPayment: payments.openPropertyPayment,
      openExpense: expenses.openExpense,
      attachLedgerEntryFormEvents,
    });
  }

  window.PropertyDeskLedgerEntryForms = Object.freeze({
    create: createLedgerEntryForms,
  });
})();
