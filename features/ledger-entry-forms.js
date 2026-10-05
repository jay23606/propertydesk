/* Payment and expense entry, correction forms, and receipt helpers. */
(() => {
  "use strict";

  function createLedgerEntryForms(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal,
    } = context;

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

    function attachEvents() {
      $("payment-form").addEventListener("submit", savePayment);
      $("expense-form").addEventListener("submit", saveExpense);
      $("payment-account").addEventListener("change", () => {
        prefillPaymentAmount();
        updateAllocationPreview();
      });
      $("payment-amount").addEventListener("input", updateAllocationPreview);
      $("payment-date").addEventListener("change", updateAllocationPreview);
      $("expense-property").addEventListener("change", () => {
        const propertyId = $("expense-property").value;
        const relatedAccounts = state.accounts.filter(
          (account) => account.property_id === propertyId,
        );
        fillSelect(
          "expense-account",
          relatedAccounts.map((account) => ({
            value: account.id,
            label: `${account.name} — ${prettyType(account.account_type)}`,
          })),
          "Property level",
        );
      });
      $("expense-category").addEventListener("change", () => {
        $("deposit-refund-hint").classList.toggle(
          "hidden",
          $("expense-category").value !== "deposit_refund",
        );
      });
    }

    return { updateAllocationPreview, prefillPaymentAmount, savePayment, saveExpense, openPayment, openPropertyPayment, openExpense, attachEvents };
  }

  window.PropertyDeskLedgerEntryForms = Object.freeze({ create: createLedgerEntryForms });
})();
