/* Rental, land-contract, and note account creation, editing, and term workflow. */
(() => {
  "use strict";

  function createAccountForm(context) {
    const {
      $, state, moneyInput, toast, closeModal, fetchAll, buildAccountPayload,
      formModel,
    } = context;
    const formView = window.PropertyDeskAccountFormView.create(context);
    const { resetAccountForm, updateLoanFields, editAccount } = formView;

    async function saveAccount(event) {
      event.preventDefault();
      const id = $("account-id").value;
      const type = $("account-type").value;
      const reminderEnabled = $("account-reminder-enabled").checked;
      const contacts = formModel.partyEmails(
        $("account-party-email").value,
        reminderEnabled,
      );
      if (contacts.error) {
        toast(contacts.error);
        return;
      }
      const payload = buildAccountPayload(
        {
          ownerId: state.workspaceOwnerId,
          propertyId: $("account-property").value,
          accountType: type,
          name: $("account-name").value.trim(),
          partyName: $("account-party").value.trim(),
          partyEmails: contacts.emails,
          partyPhone: $("account-party-phone").value.trim(),
          reminderEnabled,
          startDate: $("account-start").value,
          nextDueDate: $("account-next-due").value,
          paymentAmount: $("account-payment").value,
          paymentFrequency: $("account-frequency").value,
          originalPrincipal: $("account-principal").value,
          principalInterestAmount: $("account-pi-payment").value,
          escrowAmount: $("account-escrow").value,
          balanceAdjustment: $("account-balance-adjustment").value,
          interestRate: $("account-rate").value,
          termMonths: $("account-term").value,
          balloonDate: $("account-balloon").value,
          agreementEffectiveDate: $("account-effective-date").value,
          agreementChangeReason: $("account-change-reason").value.trim(),
          lateFee: $("account-late-fee").value,
          graceDays: $("account-grace").value,
          notes: $("account-notes").value.trim(),
        },
        moneyInput,
      );
      const query = id
        ? state.client.from("pd_accounts").update(payload).eq("id", id)
        : state.client.from("pd_accounts").insert(payload);
      let error;
      try {
        ({ error } = await query);
      } catch {
        toast("Account couldn't be saved right now. Check your connection and try again.");
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
      toast(id ? "Account updated" : "Account added");
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
