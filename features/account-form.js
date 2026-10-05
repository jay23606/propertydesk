/* Rental, land-contract, and note account creation, editing, and term workflow. */
(() => {
  "use strict";

  function createAccountForm(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal,
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
      const partyEmails = $("account-party-email")
        .value.split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean);
      if (partyEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        toast("Check each tenant/buyer email address.");
        return;
      }
      if ($("account-reminder-enabled").checked && !partyEmails.length) {
        toast("Add at least one tenant/buyer email before enabling reminders.");
        return;
      }
      const payload = {
        user_id: state.workspaceOwnerId,
        property_id: $("account-property").value,
        account_type: type,
        name: $("account-name").value.trim(),
        party_name: $("account-party").value.trim() || null,
        party_email: partyEmails.join(", ") || null,
        party_phone: $("account-party-phone").value.trim() || null,
        monthly_reminder_enabled: $("account-reminder-enabled").checked,
        start_date: $("account-start").value,
        next_due_date: $("account-next-due").value || null,
        payment_amount: moneyInput($("account-payment").value),
        payment_frequency: $("account-frequency").value,
        original_principal:
          type === "rental" ? 0 : moneyInput($("account-principal").value),
        principal_interest_amount:
          type === "rental" || !$("account-pi-payment").value
            ? null
            : moneyInput($("account-pi-payment").value),
        escrow_amount:
          type === "rental" ? 0 : moneyInput($("account-escrow").value),
        balance_adjustment:
          type === "rental"
            ? 0
            : moneyInput($("account-balance-adjustment").value),
        interest_rate:
          type === "rental" ? 0 : Number($("account-rate").value || 0),
        term_months:
          type === "rental" || !$("account-term").value
            ? null
            : Number($("account-term").value),
        balloon_date:
          type === "rental" ? null : $("account-balloon").value || null,
        agreement_effective_date: $("account-effective-date").value || null,
        agreement_change_reason:
          $("account-change-reason").value.trim() || null,
        late_fee: moneyInput($("account-late-fee").value),
        grace_days: Number($("account-grace").value || 0),
        notes: $("account-notes").value.trim() || null,
      };
      const query = id
        ? state.client.from("pd_accounts").update(payload).eq("id", id)
        : state.client.from("pd_accounts").insert(payload);
      const { error } = await query;
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("account-modal"));
      resetAccountForm();
      await fetchAll();
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
