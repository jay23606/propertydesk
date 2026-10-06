/* Compose record entry forms with their top-level create actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      fillSelect,
      prettyType,
      openModal,
      previewReminderEmail,
      navigate,
      documentRef,
    } = context;
    const recordEntry = window.PropertyDeskLedgerWorkflow.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      fillSelect,
      prettyType,
      openModal,
      previewReminderEmail,
    });
    const { attachEvents: attachCreateActions, openAccountForProperty } =
      window.PropertyDeskCreateActions.create({
        $,
        state,
        toast,
        resetPropertyForm: recordEntry.resetPropertyForm,
        resetAccountForm: recordEntry.resetAccountForm,
        populateFormOptions,
        openModal,
        openPayment: recordEntry.openPayment,
        openExpense: recordEntry.openExpense,
        navigate,
        documentRef,
      });

    function attachEvents() {
      attachCreateActions();
      recordEntry.attachPropertyFormEvents();
      recordEntry.attachAccountFormEvents();
      recordEntry.attachLedgerEntryFormEvents();
    }

    return {
      editAccount: recordEntry.editAccount,
      updatePaymentGuidance: recordEntry.updatePaymentGuidance,
      openPayment: recordEntry.openPayment,
      openPropertyPayment: recordEntry.openPropertyPayment,
      openExpense: recordEntry.openExpense,
      attachEvents,
      openAccountForProperty,
    };
  }

  window.PropertyDeskEntryWorkflow = Object.freeze({ create });
})();
