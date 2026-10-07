/* Connect audited corrections to the shared property and ledger entry forms. */
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
    } = context;
    const { saveCorrection } = window.PropertyDeskTransactionCorrections.create(
      {
        $,
        state,
        toast,
        fetchAll,
        closeModal,
      },
    );
    const entries = window.PropertyDeskRecordEntryWorkflow.create({
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
      saveCorrection,
    });
    return {
      resetPropertyForm: entries.resetPropertyForm,
      resetAccountForm: entries.resetAccountForm,
      editAccount: entries.editAccount,
      updatePaymentGuidance: entries.updatePaymentGuidance,
      openPayment: entries.openPayment,
      openPropertyPayment: entries.openPropertyPayment,
      openExpense: entries.openExpense,
      attachPropertyFormEvents: entries.attachPropertyFormEvents,
      attachAccountFormEvents: entries.attachAccountFormEvents,
      attachLedgerEntryFormEvents: entries.attachLedgerEntryFormEvents,
    };
  }

  window.PropertyDeskLedgerWorkflow = Object.freeze({ create });
})();
