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
    writeFeedback,
    selectRecordWriteCompletion,
    expenseAccountPolicy,
    workflows,
  }) {
    const {
      buildPayment,
      buildExpense,
      buildPaymentCorrection,
      buildExpenseCorrection,
    } = transactionPayloads;
    const { insertPayment, insertExpense } =
      window.PropertyDeskTransactionInserts.create({
        state,
        fetchAll,
        toast,
        repository: transactionRepository,
        writeFeedback,
        selectRecordWriteCompletion,
      });
    const { saveTransactionEntry } =
      window.PropertyDeskLedgerEntrySaveWorkflow.create({
        $,
        state,
        saveCorrection,
        closeModal,
        toast,
      });
    const payments = window.PropertyDeskPaymentEntryForm.create({
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
    const expenses = window.PropertyDeskExpenseEntryForm.create({
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
