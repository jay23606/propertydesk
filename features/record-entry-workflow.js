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
    const sharedEntryContext = {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      openModal,
    };
    const propertyAccountEntry =
      window.PropertyDeskPropertyAccountEntryWorkflow.create({
        ...sharedEntryContext,
        previewReminderEmail,
        propertyRepository,
        accountRepository,
        accountPayload,
        accountFormModel,
      });
    const ledgerEntry = window.PropertyDeskLedgerEntryWorkflow.create({
      ...sharedEntryContext,
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
