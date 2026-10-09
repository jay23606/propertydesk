/* Collect the workflow modules owned by property and account forms. */
(() => {
  "use strict";

  function createPropertyAccountFormsModuleCatalog() {
    return Object.freeze({
      forms: window.PropertyDeskPropertyAccountFormsWorkflow,
      propertyForm: window.PropertyDeskPropertyForm,
      accountForm: window.PropertyDeskAccountForm,
      propertyFormModules: {
        view: window.PropertyDeskPropertyFormView,
        saveWorkflow: window.PropertyDeskWorkspaceFormSaveWorkflow,
        maintenance: window.PropertyDeskPropertySaveMaintenance,
        recordSaveMaintenance:
          window.PropertyDeskWorkspaceRecordSaveMaintenance,
      },
      accountFormModules: {
        view: window.PropertyDeskAccountFormView,
        saveWorkflow: window.PropertyDeskWorkspaceFormSaveWorkflow,
        maintenance: window.PropertyDeskAccountFormMaintenance,
        recordSaveMaintenance:
          window.PropertyDeskWorkspaceRecordSaveMaintenance,
        propertyAction: window.PropertyDeskPropertyAccountAction,
      },
      accountPayload: window.PropertyDeskAccountPayload,
      accountFormModel: window.PropertyDeskAccountFormModel,
      emailAddressUtils: window.PropertyDeskEmailAddressUtils,
      recordWrite: window.PropertyDeskWorkspaceRecordWriteWorkflow,
    });
  }

  window.PropertyDeskPropertyAccountFormsModuleCatalog = Object.freeze({
    create: createPropertyAccountFormsModuleCatalog,
  });
})();
