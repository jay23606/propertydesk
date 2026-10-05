/* PropertyDesk property, account, and transaction entry workflows. */
(() => {
  "use strict";

  function createRecordForms(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
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
    function updateAllocationPreview() {
      const a = state.accounts.find((x) => x.id === $("payment-account").value),
        amount = moneyInput($("payment-amount").value);
      if (!a || !amount) {
        $("allocation-preview").innerHTML = "";
        return;
      }
      $("income-category-wrap").classList.toggle(
        "hidden",
        a.account_type !== "rental",
      );
      if (a.account_type === "rental") {
        $("allocation-preview").innerHTML = "";
        return;
      }
      $("allocation-preview").innerHTML =
        '<p class="allocation-note">Payment history only. The estimated loan balance assumes every scheduled installment was paid on time; recorded receipts affect Unpaid Due, not this estimate.</p>';
    }
    function prefillPaymentAmount() {
      const amountInput = $("payment-amount");
      if (amountInput.value) return false;
      const account = state.accounts.find(
        (item) => item.id === $("payment-account").value,
      );
      const scheduledAmount = Number(account?.payment_amount || 0);
      if (!Number.isFinite(scheduledAmount) || scheduledAmount <= 0)
        return false;
      amountInput.value = account.payment_amount;
      return true;
    }
    async function savePayment(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "payment-save-next",
        account = state.accounts.find(
          (a) => a.id === $("payment-account").value,
        ),
        amount = moneyInput($("payment-amount").value);
      if (!account || !amount) return;
      // Log whether the installment arrived; don't estimate a payoff allocation from the receipt.
      // Keep the legacy database allocation constraint satisfied by recording loan receipts as unapplied.
      const alloc =
        account.account_type === "rental"
          ? { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: 0 }
          : { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: amount };
      const payload = {
        user_id: state.workspaceOwnerId,
        account_id: account.id,
        amount,
        received_date: $("payment-date").value,
        payment_method: $("payment-method").value,
        income_category:
          account.account_type === "rental"
            ? $("income-category").value
            : "installment",
        principal_amount: alloc.principal,
        interest_amount: alloc.interest,
        fee_amount: alloc.fee,
        escrow_amount: alloc.escrow,
        unapplied_amount: alloc.unapplied,
        memo: $("payment-memo").value.trim() || null,
        source_type: "manual",
      };
      if (state.pendingCorrection?.kind === "payment") {
        const { error } = await state.client.rpc("pd_correct_transaction", {
          p_kind: "payment",
          p_transaction_id: state.pendingCorrection.id,
          p_correction: {
            account_id: payload.account_id,
            amount: payload.amount,
            received_date: payload.received_date,
            payment_method: payload.payment_method,
            income_category: payload.income_category,
            principal_amount: payload.principal_amount,
            interest_amount: payload.interest_amount,
            fee_amount: payload.fee_amount,
            escrow_amount: payload.escrow_amount,
            unapplied_amount: payload.unapplied_amount,
            memo: payload.memo,
          },
          p_reason: state.pendingCorrection.reason,
        });
        if (error) {
          toast(
            `Correction failed; original entry is unchanged. ${error.message}`,
          );
          return;
        }
        closeModal($("payment-modal"));
        await fetchAll();
        toast("Payment corrected; original kept in history");
        return;
      }
      const { error } = await state.client.from("pd_payments").insert(payload);
      if (error) {
        toast(error.message);
        return;
      }
      $("payment-form").reset();
      $("payment-date").value = todayIso();
      $("payment-account").value = account.id;
      await fetchAll();
      if (addAnother) {
        updateAllocationPreview();
        $("payment-amount").focus();
        toast("Payment recorded. Ready for the next entry");
        return;
      }
      closeModal($("payment-modal"));
      toast("Payment recorded");
    }
    async function saveExpense(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "expense-save-next",
        propertyId = $("expense-property").value,
        accountId = $("expense-account").value,
        category = $("expense-category").value,
        payee = $("expense-payee").value.trim(),
        method = $("expense-method").value;
      const account = state.accounts.find((item) => item.id === accountId);
      if (category === "deposit_refund" && account?.account_type !== "rental") {
        toast("Choose a rental account for a security deposit refund");
        return;
      }
      const payload = {
        user_id: state.workspaceOwnerId,
        property_id: propertyId,
        account_id: accountId || null,
        amount: moneyInput($("expense-amount").value),
        expense_date: $("expense-date").value,
        category,
        payee: payee || null,
        payment_method: method,
        memo: $("expense-memo").value.trim() || null,
        source_type: "manual",
      };
      if (state.pendingCorrection?.kind === "expense") {
        const { error } = await state.client.rpc("pd_correct_transaction", {
          p_kind: "expense",
          p_transaction_id: state.pendingCorrection.id,
          p_correction: {
            property_id: payload.property_id,
            account_id: payload.account_id,
            amount: payload.amount,
            expense_date: payload.expense_date,
            category: payload.category,
            payee: payload.payee,
            payment_method: payload.payment_method,
            memo: payload.memo,
          },
          p_reason: state.pendingCorrection.reason,
        });
        if (error) {
          toast(
            `Correction failed; original entry is unchanged. ${error.message}`,
          );
          return;
        }
        closeModal($("expense-modal"));
        await fetchAll();
        toast("Expense corrected; original kept in history");
        return;
      }
      const { error } = await state.client.from("pd_expenses").insert(payload);
      if (error) {
        toast(error.message);
        return;
      }
      $("expense-form").reset();
      $("expense-date").value = todayIso();
      await fetchAll();
      if (addAnother) {
        $("expense-property").value = propertyId;
        $("expense-property").dispatchEvent(new Event("change"));
        $("expense-account").value = accountId;
        $("expense-category").value = category;
        $("expense-payee").value = payee;
        $("expense-method").value = method;
        $("expense-amount").focus();
        toast("Expense recorded. Ready for the next entry");
        return;
      }
      closeModal($("expense-modal"));
      toast("Expense recorded");
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
    function openPayment(accountId, propertyId = null) {
      state.pendingCorrection = null;
      populateFormOptions();
      if (propertyId)
        fillSelect(
          "payment-account",
          state.accounts
            .filter(
              (a) => a.property_id === propertyId && a.status === "active",
            )
            .map((a) => ({
              value: a.id,
              label: `${a.party_name || a.name} — ${prettyType(a.account_type)}`,
            })),
          "Choose an account",
        );
      $("payment-form").reset();
      $("payment-modal-title").textContent = "Record payment";
      $("payment-modal").querySelector(".eyebrow").textContent =
        "PAYMENT ENTRY";
      $("payment-save-button").textContent = "Save payment";
      $("payment-save-next").classList.remove("hidden");
      $("payment-date").value = todayIso();
      if (accountId) $("payment-account").value = accountId;
      prefillPaymentAmount();
      updateAllocationPreview();
      openModal("payment-modal");
    }
    function openPropertyPayment(propertyId) {
      const accounts = state.accounts.filter(
        (a) => a.property_id === propertyId && a.status === "active",
      );
      if (!accounts.length) {
        toast("Add an active account before recording a payment");
        return;
      }
      openPayment(accounts.length === 1 ? accounts[0].id : null, propertyId);
    }
    function openExpense(propertyId) {
      state.pendingCorrection = null;
      populateFormOptions();
      $("expense-form").reset();
      $("expense-modal-title").textContent = "Record expense";
      $("expense-modal").querySelector(".eyebrow").textContent =
        "PROPERTY EXPENSE";
      $("expense-save-button").textContent = "Save expense";
      $("expense-save-next").classList.remove("hidden");
      $("expense-date").value = todayIso();
      $("deposit-refund-hint").classList.add("hidden");
      if (propertyId) $("expense-property").value = propertyId;
      openModal("expense-modal");
    }
    return {
      resetPropertyForm,
      resetAccountForm,
      updateLoanFields,
      saveProperty,
      saveAccount,
      updateAllocationPreview,
      prefillPaymentAmount,
      savePayment,
      saveExpense,
      editAccount,
      openPayment,
      openPropertyPayment,
      openExpense,
    };
  }

  window.PropertyDeskRecordForms = Object.freeze({ create: createRecordForms });
})();
