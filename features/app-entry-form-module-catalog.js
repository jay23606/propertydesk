/* Collect shared entry-form infrastructure and reminder-preview modules. */
(() => {
  "use strict";

  function createAppEntryFormModuleCatalog() {
    return Object.freeze({
      modal: window.PropertyDeskModalController,
      formOptions: window.PropertyDeskFormOptions,
      formOptionModules: {
        domainOptions: window.PropertyDeskDomainOptions,
        transactionOptions: window.PropertyDeskTransactionOptions,
      },
      reminderPreviewSetup: window.PropertyDeskReminderPreviewSetup,
      reminderPreview: window.PropertyDeskReminderPreviewModuleCatalog.create(),
      emailAddressUtils: window.PropertyDeskEmailAddressUtils,
    });
  }

  window.PropertyDeskAppEntryFormModuleCatalog = Object.freeze({
    create: createAppEntryFormModuleCatalog,
  });
})();
