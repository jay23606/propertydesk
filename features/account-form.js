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
      buildAccountPayload,
      formModel,
    } = context;
    const formView = window.PropertyDeskAccountFormView.create(context);
    const { resetAccountForm, updateLoanFields, readValues, editAccount } =
      formView;

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
      const query = form.id
        ? state.client.from("pd_accounts").update(payload).eq("id", form.id)
        : state.client.from("pd_accounts").insert(payload);
      let error;
      try {
        ({ error } = await query);
      } catch {
        toast(
          "Account couldn't be saved right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("account-modal"));
      resetAccountForm();
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast(form.id ? "Account updated" : "Account added");
    }

    function attachEvents(previewReminderEmail) {
      formView.attachEvents(saveAccount, previewReminderEmail);
    }

    return {
      resetAccountForm,
      updateLoanFields,
      saveAccount,
      editAccount,
      attachEvents,
    };
  }

  window.PropertyDeskAccountForm = Object.freeze({ create: createAccountForm });
})();
