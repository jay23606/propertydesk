/* Compose account/property forms, ledger entry forms, and their launch actions. */
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
    const propertyAccountForms = window.PropertyDeskPropertyAccountForms.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal,
    });
    const ledgerEntryForms = window.PropertyDeskLedgerEntryForms.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll, fillSelect,
      populateFormOptions, prettyType, openModal, saveCorrection,
    });
    const {
      resetPropertyForm,
      resetAccountForm,
      editAccount,
    } = propertyAccountForms;
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
      attachPropertyFormEvents: propertyAccountForms.attachEvents,
      attachLedgerEntryFormEvents: ledgerEntryForms.attachEvents,
      attachCreateActions,
    };
  }

  window.PropertyDeskEntryWorkflow = Object.freeze({ create });
})();
