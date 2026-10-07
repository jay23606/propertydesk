/* Compose property, account, payment, and expense form workflows. */
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
      navigate,
      documentRef,
      accountRepository,
      transactionRepository,
      transactionPayloads,
    } = context;
    const propertyForm = window.PropertyDeskPropertyForm.create({
      $,
      state,
      toast,
      closeModal,
      fetchAll,
    });
    const accountForm = window.PropertyDeskAccountForm.create({
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
      buildAccountPayload: window.PropertyDeskAccountPayload.build,
      formModel: window.PropertyDeskAccountFormModel,
      repository: accountRepository,
    });
    const ledgerEntryForms = window.PropertyDeskLedgerEntryForms.create({
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
      transactionRepository,
      transactionPayloads,
    });
    const createActions = window.PropertyDeskCreateActions.create({
      $,
      state,
      toast,
      resetPropertyForm: propertyForm.resetPropertyForm,
      openModal,
      openAccountForProperty: accountForm.openAccountForProperty,
      openPayment: ledgerEntryForms.openPayment,
      openExpense: ledgerEntryForms.openExpense,
      navigate,
      documentRef,
    });
    return {
      editAccount: accountForm.editAccount,
      openAccountForProperty: accountForm.openAccountForProperty,
      updatePaymentGuidance: ledgerEntryForms.updatePaymentGuidance,
      openPayment: ledgerEntryForms.openPayment,
      openPropertyPayment: ledgerEntryForms.openPropertyPayment,
      openExpense: ledgerEntryForms.openExpense,
      attachPropertyFormEvents: propertyForm.attachEvents,
      attachAccountFormEvents: accountForm.attachEvents,
      attachLedgerEntryFormEvents: ledgerEntryForms.attachEvents,
      attachCreateActionEvents: createActions.attachEvents,
    };
  }

  window.PropertyDeskRecordEntryWorkflow = Object.freeze({ create });
})();
