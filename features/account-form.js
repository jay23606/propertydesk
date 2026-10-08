/* Rental, land-contract, and note account creation, editing, and term workflow. */
(() => {
  "use strict";

  function createAccountForm(context) {
    const {
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
    } = context;
    const formView = window.PropertyDeskAccountFormView.create({
      $,
      todayIso,
      populateFormOptions,
      openModal,
    });
    const { save: saveWorkspaceForm } =
      window.PropertyDeskWorkspaceFormSaveWorkflow.create({
        $,
        closeModal,
        fetchAll,
        toast,
      });
    const { saveAccount: persistAccount } =
      window.PropertyDeskAccountFormMaintenance.create({
        state,
        fetchAll,
        toast,
        repository,
      });
    const { resetAccountForm, readValues, editAccount } = formView;
    const { openAccountForProperty } =
      window.PropertyDeskPropertyAccountAction.create({
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
        {
          ownerId: state.workspaceOwnerId,
          propertyId: form.propertyId,
          accountType: form.type,
          name: form.name,
          partyName: form.partyName,
          partyEmails: contacts.emails,
          partyPhone: form.partyPhone,
          reminderEnabled: form.reminderEnabled,
          startDate: form.startDate,
          nextDueDate: form.nextDueDate,
          paymentAmount: form.paymentAmount,
          paymentFrequency: form.paymentFrequency,
          originalPrincipal: form.originalPrincipal,
          principalInterestAmount: form.principalInterestAmount,
          escrowAmount: form.escrowAmount,
          balanceAdjustment: form.balanceAdjustment,
          interestRate: form.interestRate,
          termMonths: form.termMonths,
          balloonDate: form.balloonDate,
          agreementEffectiveDate: form.agreementEffectiveDate,
          agreementChangeReason: form.agreementChangeReason,
          lateFee: form.lateFee,
          graceDays: form.graceDays,
          notes: form.notes,
        },
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
