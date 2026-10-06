/* Account form presentation, edit population, and event bindings. */
(() => {
  "use strict";

  function createAccountFormView({
    $,
    todayIso,
    populateFormOptions,
    openModal,
  }) {
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

    function readValues() {
      return {
        id: $("account-id").value,
        type: $("account-type").value,
        propertyId: $("account-property").value,
        name: $("account-name").value.trim(),
        partyName: $("account-party").value.trim(),
        partyEmail: $("account-party-email").value,
        partyPhone: $("account-party-phone").value.trim(),
        reminderEnabled: $("account-reminder-enabled").checked,
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
      };
    }

    function populateAccountDetails(account) {
      $("account-property").value = account.property_id;
      $("account-name").value = account.name;
      $("account-party").value = account.party_name || "";
      $("account-party-email").value = account.party_email || "";
      $("account-party-phone").value = account.party_phone || "";
      $("account-reminder-enabled").checked = Boolean(
        account.monthly_reminder_enabled,
      );
    }

    function populatePaymentSchedule(account) {
      $("account-start").value = account.start_date;
      $("account-next-due").value = account.next_due_date || "";
      $("account-payment").value = account.payment_amount;
      $("account-frequency").value = account.payment_frequency;
    }

    function populateLoanTerms(account) {
      $("account-principal").value = account.original_principal;
      $("account-pi-payment").value = account.principal_interest_amount || "";
      $("account-escrow").value = account.escrow_amount || "0";
      $("account-balance-adjustment").value = account.balance_adjustment || "0";
      $("account-effective-date").value =
        account.agreement_effective_date || "";
      $("account-change-reason").value = "";
      $("account-rate").value = account.interest_rate;
      $("account-term").value = account.term_months || "";
      $("account-balloon").value = account.balloon_date || "";
    }

    function populateAccountFees(account) {
      $("account-late-fee").value = account.late_fee;
      $("account-grace").value = account.grace_days;
      $("account-notes").value = account.notes || "";
    }

    function editAccount(account) {
      resetAccountForm();
      populateFormOptions();
      $("account-modal-title").textContent = "Edit account";
      $("account-id").value = account.id;
      $("account-type").value = account.account_type;
      updateLoanFields();
      populateAccountDetails(account);
      populatePaymentSchedule(account);
      populateLoanTerms(account);
      populateAccountFees(account);
      openModal("account-modal");
    }

    function attachEvents(saveAccount, previewReminderEmail) {
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
      readValues,
      editAccount,
      attachEvents,
    };
  }

  window.PropertyDeskAccountFormView = Object.freeze({
    create: createAccountFormView,
  });
})();
