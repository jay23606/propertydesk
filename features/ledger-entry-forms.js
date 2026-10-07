/* Compose the separate receipt and property-expense entry workflows. */
(() => {
  "use strict";

  function createLedgerEntryForms(context) {
    const {
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
    } = context;
    const {
      buildPayment,
      buildExpense,
      buildPaymentCorrection,
      buildExpenseCorrection,
    } = transactionPayloads;
    const { insertPayment, insertExpense } =
      window.PropertyDeskTransactionInserts.create({
        toast,
        repository: transactionRepository,
      });
    const { finishSuccessfulEntry } =
      window.PropertyDeskLedgerEntrySaveWorkflow.create({
        $,
        closeModal,
        fetchAll,
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
      saveCorrection,
      finishSuccessfulEntry,
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
      saveCorrection,
      finishSuccessfulEntry,
      insertExpense,
      buildExpensePayload: buildExpense,
      buildExpenseCorrection,
    });

    function attachEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    // Keep only app-level actions; submit handlers stay inside their forms.
    return {
      updatePaymentGuidance: payments.updatePaymentGuidance,
      openPayment: payments.openPayment,
      openPropertyPayment: payments.openPropertyPayment,
      openExpense: expenses.openExpense,
      attachEvents,
    };
  }

  window.PropertyDeskLedgerEntryForms = Object.freeze({
    create: createLedgerEntryForms,
  });
})();
