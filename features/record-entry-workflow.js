/* Compose property/account record forms with payment/expense forms. */
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
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      previewReminderEmail,
      saveCorrection,
      propertyRepository,
      accountRepository,
      accountPayload,
      accountFormModel,
      transactionRepository,
      transactionPayloads,
    } = context;
    const propertyAccountEntry =
      window.PropertyDeskPropertyAccountEntryWorkflow.create({
        $,
        state,
        moneyInput,
        todayIso,
        toast,
        closeModal,
        fetchAll,
        populateFormOptions,
        openModal,
        previewReminderEmail,
        propertyRepository,
        accountRepository,
        accountPayload,
        accountFormModel,
      });
    const ledgerEntry = window.PropertyDeskLedgerEntryForms.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      openModal,
      fillSelect,
      prettyType,
      saveCorrection,
      transactionRepository,
      transactionPayloads,
    });
    return {
      editAccount: propertyAccountEntry.editAccount,
      openAccountForProperty: propertyAccountEntry.openAccountForProperty,
      resetPropertyForm: propertyAccountEntry.resetPropertyForm,
      attachPropertyFormEvents: propertyAccountEntry.attachPropertyFormEvents,
      attachAccountFormEvents: propertyAccountEntry.attachAccountFormEvents,
      updatePaymentGuidance: ledgerEntry.updatePaymentGuidance,
      openPayment: ledgerEntry.openPayment,
      openPropertyPayment: ledgerEntry.openPropertyPayment,
      openExpense: ledgerEntry.openExpense,
      attachLedgerEntryFormEvents: ledgerEntry.attachLedgerEntryFormEvents,
    };
  }

  window.PropertyDeskRecordEntryWorkflow = Object.freeze({ create });
})();
