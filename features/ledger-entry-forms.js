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
    } = context;
    const payments = window.PropertyDeskPaymentEntryForm.create({
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
      buildPaymentPayload: window.PropertyDeskTransactionPayloads.buildPayment,
    });
    const expenses = window.PropertyDeskExpenseEntryForm.create({
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
      buildExpensePayload: window.PropertyDeskTransactionPayloads.buildExpense,
    });

    function attachEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    // Keep only app-level actions; submit handlers stay inside their forms.
    return {
      updateAllocationPreview: payments.updateAllocationPreview,
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
