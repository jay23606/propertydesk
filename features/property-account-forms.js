/* Compose property and account form workflows for the app coordinator. */
(() => {
  "use strict";

  function createPropertyAccountForms(context) {
    const properties = window.PropertyDeskPropertyForm.create(context);
    const accounts = window.PropertyDeskAccountForm.create(context);

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
