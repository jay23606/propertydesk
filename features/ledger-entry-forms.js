/* Compose the separate receipt and property-expense entry workflows. */
(() => {
  "use strict";

  function createLedgerEntryForms(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal, saveCorrection,
    } = context;
    const payments = window.PropertyDeskPaymentEntryForm.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal, saveCorrection,
    });
    const expenses = window.PropertyDeskExpenseEntryForm.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal, saveCorrection,
    });

    function attachEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    // Keep the combined API explicit so either form cannot shadow the other.
    return {
      updateAllocationPreview: payments.updateAllocationPreview,
      prefillPaymentAmount: payments.prefillPaymentAmount,
      savePayment: payments.savePayment,
      openPayment: payments.openPayment,
      openPropertyPayment: payments.openPropertyPayment,
      saveExpense: expenses.saveExpense,
      openExpense: expenses.openExpense,
      attachEvents,
    };
  }

  window.PropertyDeskLedgerEntryForms = Object.freeze({ create: createLedgerEntryForms });
})();
