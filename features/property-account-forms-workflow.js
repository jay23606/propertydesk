/* Compose independent property and account forms for the app coordinator. */
(() => {
  "use strict";

  function createPropertyAccountFormsWorkflow({
    property,
    account,
    workflows,
  }) {
    const propertyForm = workflows.propertyForm.create({
      $: property.$,
      getProperties: property.getProperties,
      getWorkspaceOwnerId: property.getWorkspaceOwnerId,
      toast: property.toast,
      closeModal: property.closeModal,
      fetchAll: property.fetchAll,
      repository: property.repository,
      saveWorkspaceRecord: property.saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord: property.saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion: property.selectRecordWriteCompletion,
      workflows: workflows.propertyFormModules,
    });
    const accountForm = workflows.accountForm.create({
      $: account.$,
      getAccounts: account.getAccounts,
      getWorkspaceOwnerId: account.getWorkspaceOwnerId,
      moneyInput: account.moneyInput,
      toast: account.toast,
      closeModal: account.closeModal,
      fetchAll: account.fetchAll,
      todayIso: account.todayIso,
      populateFormOptions: account.populateFormOptions,
      openModal: account.openModal,
      buildAccountPayload: account.buildAccountPayload,
      formModel: account.formModel,
      previewReminderEmail: account.previewReminderEmail,
      repository: account.repository,
      saveWorkspaceRecord: account.saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord: account.saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion: account.selectRecordWriteCompletion,
      workflows: workflows.accountFormModules,
    });

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
