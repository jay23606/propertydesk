/* Compose independent property/account forms, ledger forms, and launch actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal,
      documentRef = document,
    } = context;
    const { saveCorrection } = window.PropertyDeskTransactionCorrections.create({
      $, state, toast, fetchAll, closeModal,
    });
    const propertyForm = window.PropertyDeskPropertyForm.create({
      $, state, toast, closeModal, fetchAll,
    });
    const accountForm = window.PropertyDeskAccountForm.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal,
      buildAccountPayload: window.PropertyDeskAccountPayload.build,
      formModel: window.PropertyDeskAccountFormModel,
    });
    const ledgerEntryForms = window.PropertyDeskLedgerEntryForms.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll, fillSelect,
      populateFormOptions, prettyType, openModal, saveCorrection,
    });
    const resetPropertyForm = propertyForm.resetPropertyForm;
    const resetAccountForm = accountForm.resetAccountForm;
    const editAccount = accountForm.editAccount;
    const {
      updateAllocationPreview,
      openPayment,
      openPropertyPayment,
      openExpense,
    } = ledgerEntryForms;
    const { attachEvents: attachCreateActions } =
      window.PropertyDeskCreateActions.create({
        $, state, toast, resetPropertyForm, resetAccountForm,
        populateFormOptions, openModal, openPayment, openExpense, documentRef,
      });

    return {
      resetPropertyForm,
      resetAccountForm,
      editAccount,
      updateAllocationPreview,
      openPayment,
      openPropertyPayment,
      openExpense,
      attachPropertyFormEvents: propertyForm.attachEvents,
      attachAccountFormEvents: (previewReminderEmail) =>
        accountForm.attachEvents(previewReminderEmail),
      attachLedgerEntryFormEvents: ledgerEntryForms.attachEvents,
      attachCreateActions,
    };
  }

  window.PropertyDeskEntryWorkflow = Object.freeze({ create });
})();
