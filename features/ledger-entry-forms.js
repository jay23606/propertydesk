/* Compose the separate receipt and property-expense entry workflows. */
(() => {
  "use strict";

  function createLedgerEntryForms(context) {
    const {
      buildPayment,
      buildExpense,
      buildPaymentCorrection,
      buildExpenseCorrection,
    } = window.PropertyDeskTransactionPayloads;
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
    const { insertTransaction } = window.PropertyDeskTransactionInserts.create({
      state,
      toast,
    });
    async function finishSuccessfulEntry({
      label,
      addAnother,
      modalId,
      resetAfterSave,
      resetArguments = [],
      prepareNext,
      nextArguments = [],
    }) {
      resetAfterSave(...resetArguments);
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        prepareNext(...nextArguments);
        toast(`${label} recorded. Ready for the next entry`);
        return;
      }
      closeModal($(modalId));
      toast(`${label} recorded`);
    }
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
      insertTransaction,
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
      insertTransaction,
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
