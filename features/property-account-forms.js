/* Compose property and account form workflows for the app coordinator. */
(() => {
  "use strict";

  function createPropertyAccountForms(context) {
    const {
      $, state, toast, closeModal, fetchAll, moneyInput, todayIso,
      populateFormOptions, openModal,
    } = context;
    const properties = window.PropertyDeskPropertyForm.create({
      $, state, toast, closeModal, fetchAll,
    });
    const accounts = window.PropertyDeskAccountForm.create({
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal,
    });

    function attachEvents(previewReminderEmail) {
      properties.attachEvents();
      accounts.attachEvents(previewReminderEmail);
    }

    return {
      resetPropertyForm: properties.resetPropertyForm,
      saveProperty: properties.saveProperty,
      resetAccountForm: accounts.resetAccountForm,
      updateLoanFields: accounts.updateLoanFields,
      saveAccount: accounts.saveAccount,
      editAccount: accounts.editAccount,
      attachEvents,
    };
  }

  window.PropertyDeskPropertyAccountForms = Object.freeze({
    create: createPropertyAccountForms,
  });
})();
