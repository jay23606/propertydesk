/* Property and account creation, editing, and terms forms. */
(() => {
  "use strict";

  function createPropertyAccountForms(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      populateFormOptions, openModal,
    } = context;

    function resetPropertyForm() {
      $("property-form").reset();
      $("property-id").value = "";
      $("property-modal-title").textContent = "Add property";
    }
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

    async function saveProperty(event) {
      event.preventDefault();
      const id = $("property-id").value;
      const payload = {
        user_id: state.workspaceOwnerId,
        name: $("property-name").value.trim(),
        address: $("property-address").value.trim(),
        city: $("property-city").value.trim() || null,
        state: $("property-state").value.trim().toUpperCase() || null,
        postal_code: $("property-zip").value.trim() || null,
        property_kind: $("property-kind").value,
        notes: $("property-notes").value.trim() || null,
      };
      const q = id
        ? state.client.from("pd_properties").update(payload).eq("id", id)
        : state.client.from("pd_properties").insert(payload);
      const { error } = await q;
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("property-modal"));
      resetPropertyForm();
      await fetchAll();
      toast(id ? "Property updated" : "Property added");
    }
    async function saveAccount(event) {
      event.preventDefault();
      const id = $("account-id").value,
        type = $("account-type").value;
      const partyEmails = $("account-party-email")
        .value.split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean);
      if (
        partyEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ) {
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
      const q = id
        ? state.client.from("pd_accounts").update(payload).eq("id", id)
        : state.client.from("pd_accounts").insert(payload);
      const { error } = await q;
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("account-modal"));
      resetAccountForm();
      await fetchAll();
      toast(id ? "Account updated" : "Account added");
    }

    function editAccount(a) {
      resetAccountForm();
      populateFormOptions();
      $("account-modal-title").textContent = "Edit account";
      $("account-id").value = a.id;
      $("account-type").value = a.account_type;
      updateLoanFields();
      $("account-property").value = a.property_id;
      $("account-name").value = a.name;
      $("account-party").value = a.party_name || "";
      $("account-party-email").value = a.party_email || "";
      $("account-party-phone").value = a.party_phone || "";
      $("account-reminder-enabled").checked = Boolean(
        a.monthly_reminder_enabled,
      );
      $("account-start").value = a.start_date;
      $("account-next-due").value = a.next_due_date || "";
      $("account-payment").value = a.payment_amount;
      $("account-frequency").value = a.payment_frequency;
      $("account-principal").value = a.original_principal;
      $("account-pi-payment").value = a.principal_interest_amount || "";
      $("account-escrow").value = a.escrow_amount || "0";
      $("account-balance-adjustment").value = a.balance_adjustment || "0";
      $("account-effective-date").value = a.agreement_effective_date || "";
      $("account-change-reason").value = "";
      $("account-rate").value = a.interest_rate;
      $("account-term").value = a.term_months || "";
      $("account-balloon").value = a.balloon_date || "";
      $("account-late-fee").value = a.late_fee;
      $("account-grace").value = a.grace_days;
      $("account-notes").value = a.notes || "";
      openModal("account-modal");
    }

    function attachEvents(previewReminderEmail) {
      $("property-form").addEventListener("submit", saveProperty);
      $("account-form").addEventListener("submit", saveAccount);
      $("account-reminder-preview").addEventListener(
        "click",
        previewReminderEmail,
      );
      $("account-type").addEventListener("change", updateLoanFields);
    }

    return { resetPropertyForm, resetAccountForm, updateLoanFields, saveProperty, saveAccount, editAccount, attachEvents };
  }

  window.PropertyDeskPropertyAccountForms = Object.freeze({ create: createPropertyAccountForms });
})();
