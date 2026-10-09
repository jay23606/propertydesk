/* Connect property/account form accessors, persistence, and feature modules. */
(() => {
  "use strict";

  function createPropertyAccountFormsSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    return workflows.forms.create({
      property: {
        $: ui.$,
        getProperties: records.getProperties,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        toast: ui.toast,
        closeModal: ui.closeModal,
        fetchAll: services.fetchAll,
        repository: services.propertyRepository,
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion:
          workflows.recordWrite.selectRecordWriteCompletion,
      },
      account: {
        $: ui.$,
        getAccounts: records.getAccounts,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        moneyInput: ui.moneyInput,
        toast: ui.toast,
        closeModal: ui.closeModal,
        fetchAll: services.fetchAll,
        todayIso: ui.todayIso,
        populateFormOptions: ui.populateFormOptions,
        openModal: ui.openModal,
        buildAccountPayload: workflows.accountPayload.build,
        formModel: workflows.accountFormModel.create(
          workflows.emailAddressUtils,
        ),
        previewReminderEmail: ui.previewReminderEmail,
        repository: {
          save: services.accountRepository.save,
        },
        saveWorkspaceRecord: services.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion:
          workflows.recordWrite.selectRecordWriteCompletion,
      },
      workflows: {
        propertyForm: workflows.propertyForm,
        accountForm: workflows.accountForm,
        propertyFormModules: workflows.propertyFormModules,
        accountFormModules: workflows.accountFormModules,
      },
    });
  }

  window.PropertyDeskPropertyAccountFormsSetup = Object.freeze({
    create: createPropertyAccountFormsSetup,
  });
})();
