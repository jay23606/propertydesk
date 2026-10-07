/* Compose property and account record forms as one entry surface. */
(() => {
  "use strict";

  function create(context) {
    const propertyForm = window.PropertyDeskPropertyForm.create({
      $: context.$,
      state: context.state,
      toast: context.toast,
      closeModal: context.closeModal,
      fetchAll: context.fetchAll,
      repository: context.propertyRepository,
    });
    const accountForm = window.PropertyDeskAccountForm.create({
      $: context.$,
      state: context.state,
      moneyInput: context.moneyInput,
      todayIso: context.todayIso,
      toast: context.toast,
      closeModal: context.closeModal,
      fetchAll: context.fetchAll,
      populateFormOptions: context.populateFormOptions,
      openModal: context.openModal,
      previewReminderEmail: context.previewReminderEmail,
      buildAccountPayload: context.accountPayload,
      formModel: context.accountFormModel,
      repository: context.accountRepository,
    });

    return {
      editAccount: accountForm.editAccount,
      openAccountForProperty: accountForm.openAccountForProperty,
      resetPropertyForm: propertyForm.resetPropertyForm,
      attachPropertyFormEvents: propertyForm.attachEvents,
      attachAccountFormEvents: accountForm.attachEvents,
    };
  }

  window.PropertyDeskPropertyAccountEntryWorkflow = Object.freeze({ create });
})();
