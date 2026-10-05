/* Rental, land-contract, and note account creation, editing, and term workflow. */
(() => {
  "use strict";

  function createAccountForm(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal, buildAccountPayload, formModel,
    } = context;

    function resetAccountForm() {
      $("account-form").reset();
      $("account-id").value = "";
      $("account-start").value = todayIso();
      $("account-payment").value = "0";
      $("account-balance-adjustment").value = "0";
      $("account-late-fee").value = "0";
      $("account-grace").value = "0";
      $("account-reminder-enabled").checked = false;
      $("account-modal-title").textContent = "Add account";
      updateLoanFields();
    }

    function updateLoanFields() {
      const isRental = $("account-type").value === "rental";
      $("loan-fields").classList.toggle("hidden", isRental);
    }

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

    function editAccount(account) {
      resetAccountForm();
      populateFormOptions();
      $("account-modal-title").textContent = "Edit account";
      $("account-id").value = account.id;
      $("account-type").value = account.account_type;
      updateLoanFields();
      $("account-property").value = account.property_id;
      $("account-name").value = account.name;
      $("account-party").value = account.party_name || "";
      $("account-party-email").value = account.party_email || "";
      $("account-party-phone").value = account.party_phone || "";
      $("account-reminder-enabled").checked = Boolean(
        account.monthly_reminder_enabled,
      );
      $("account-start").value = account.start_date;
      $("account-next-due").value = account.next_due_date || "";
      $("account-payment").value = account.payment_amount;
      $("account-frequency").value = account.payment_frequency;
      $("account-principal").value = account.original_principal;
      $("account-pi-payment").value = account.principal_interest_amount || "";
      $("account-escrow").value = account.escrow_amount || "0";
      $("account-balance-adjustment").value = account.balance_adjustment || "0";
      $("account-effective-date").value = account.agreement_effective_date || "";
      $("account-change-reason").value = "";
      $("account-rate").value = account.interest_rate;
      $("account-term").value = account.term_months || "";
      $("account-balloon").value = account.balloon_date || "";
      $("account-late-fee").value = account.late_fee;
      $("account-grace").value = account.grace_days;
      $("account-notes").value = account.notes || "";
      openModal("account-modal");
    }

    function attachEvents(previewReminderEmail) {
      $("account-form").addEventListener("submit", saveAccount);
      $("account-reminder-preview").addEventListener(
        "click",
        previewReminderEmail,
      );
      $("account-type").addEventListener("change", updateLoanFields);
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
