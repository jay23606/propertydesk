/* Compose independent property and account forms for the app coordinator. */
(() => {
  "use strict";

  function createPropertyAccountFormsWorkflow({ property, account }) {
    const propertyForm = window.PropertyDeskPropertyForm.create(property);
    const accountForm = window.PropertyDeskAccountForm.create(account);

    return Object.freeze({
      resetPropertyForm: propertyForm.resetPropertyForm,
      attachPropertyFormEvents: propertyForm.attachEvents,
      openAccountForProperty: accountForm.openAccountForProperty,
      editAccount: accountForm.editAccount,
      attachAccountFormEvents: accountForm.attachEvents,
    });
  }

  window.PropertyDeskPropertyAccountFormsWorkflow = Object.freeze({
    create: createPropertyAccountFormsWorkflow,
  });
})();
