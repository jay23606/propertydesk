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
      ...properties,
      ...accounts,
      attachEvents,
    };
  }

  window.PropertyDeskPropertyAccountForms = Object.freeze({
    create: createPropertyAccountForms,
  });
})();
