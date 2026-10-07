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
    const { openAccountForProperty } =
      window.PropertyDeskPropertyAccountAction.create({
        $,
        resetAccountForm: accountForm.resetAccountForm,
        populateFormOptions,
        openModal,
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
    return {
      resetPropertyForm: propertyForm.resetPropertyForm,
      resetAccountForm: accountForm.resetAccountForm,
      editAccount: accountForm.editAccount,
      openAccountForProperty,
      updatePaymentGuidance: ledgerEntryForms.updatePaymentGuidance,
      openPayment: ledgerEntryForms.openPayment,
      openPropertyPayment: ledgerEntryForms.openPropertyPayment,
      openExpense: ledgerEntryForms.openExpense,
      attachPropertyFormEvents: propertyForm.attachEvents,
      attachAccountFormEvents: accountForm.attachEvents,
      attachLedgerEntryFormEvents: ledgerEntryForms.attachEvents,
    };
  }

  window.PropertyDeskRecordEntryWorkflow = Object.freeze({ create });
})();
