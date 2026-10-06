/* Compose property, account, payment, and expense entry workflows. */
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
      navigate,
      previewReminderEmail,
      saveCorrection,
      documentRef = document,
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
    });
    const createActions = window.PropertyDeskCreateActions.create({
      $,
      state,
      toast,
      resetPropertyForm: propertyForm.resetPropertyForm,
      resetAccountForm: accountForm.resetAccountForm,
      populateFormOptions,
      openModal,
      navigate,
      openPayment: ledgerEntryForms.openPayment,
      openExpense: ledgerEntryForms.openExpense,
      documentRef,
    });

    return {
      resetAccountForm: accountForm.resetAccountForm,
      editAccount: accountForm.editAccount,
      updateAllocationPreview: ledgerEntryForms.updateAllocationPreview,
      openPayment: ledgerEntryForms.openPayment,
      openPropertyPayment: ledgerEntryForms.openPropertyPayment,
      openExpense: ledgerEntryForms.openExpense,
      attachCreateActions: createActions.attachEvents,
      attachPropertyFormEvents: propertyForm.attachEvents,
      attachAccountFormEvents: accountForm.attachEvents,
      attachLedgerEntryFormEvents: ledgerEntryForms.attachEvents,
    };
  }

  window.PropertyDeskRecordEntryWorkflow = Object.freeze({ create });
})();
