/* Rental, land-contract, and note account creation, editing, and term workflow. */
(() => {
  "use strict";

  function createAccountForm({
    $,
    state,
    moneyInput,
    toast,
    closeModal,
    fetchAll,
    todayIso,
    populateFormOptions,
    openModal,
    buildAccountPayload,
    formModel,
    previewReminderEmail,
    repository,
    writeFeedback,
    selectRecordWriteCompletion,
    workflows,
  }) {
    const formView = workflows.view.create({
      $,
      todayIso,
      populateFormOptions,
      openModal,
    });
    const { save: saveWorkspaceForm } = workflows.saveWorkflow.create({
      $,
      closeModal,
      toast,
    });
    const { saveAccount: persistAccount } = workflows.maintenance.create({
      state,
      fetchAll,
      toast,
      repository,
      writeFeedback,
      selectRecordWriteCompletion,
    });
    const { resetAccountForm, readValues, editAccount } = formView;
    const { openAccountForProperty } = workflows.propertyAction.create({
      $,
      resetAccountForm,
      populateFormOptions,
      openModal,
    });

    async function saveAccount(event) {
      event.preventDefault();
      const form = readValues();
      const contacts = formModel.partyEmails(
        form.partyEmail,
        form.reminderEnabled,
      );
      if (contacts.error) {
        toast(contacts.error);
        return;
      }
      const payload = buildAccountPayload(
        formModel.payloadValuesFromForm(
          form,
          state.workspaceOwnerId,
          contacts.emails,
        ),
        moneyInput,
      );
      await saveWorkspaceForm({
        persist: persistAccount,
        payload,
        id: form.id,
        modalId: "account-modal",
        resetForm: resetAccountForm,
        label: "Account",
      });
    }

    function attachEvents() {
      formView.attachEvents(saveAccount, previewReminderEmail);
    }

    return Object.freeze({
      openAccountForProperty,
      editAccount,
      attachEvents,
    });
  }

  window.PropertyDeskAccountForm = Object.freeze({ create: createAccountForm });
})();
