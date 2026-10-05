/* Installment and rent receipt entry and correction workflow. */
(() => {
  "use strict";

  function createPaymentEntryForm(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal,
    } = context;

    function updateAllocationPreview() {
      const account = state.accounts.find((item) => item.id === $("payment-account").value);
      const amount = moneyInput($("payment-amount").value);
      if (!account || !amount) {
        $("allocation-preview").innerHTML = "";
        return;
      }
      $("income-category-wrap").classList.toggle(
        "hidden",
        account.account_type !== "rental",
      );
      if (account.account_type === "rental") {
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
      if (!Number.isFinite(scheduledAmount) || scheduledAmount <= 0) return false;
      amountInput.value = account.payment_amount;
      return true;
    }

    async function savePayment(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "payment-save-next";
      const account = state.accounts.find(
        (item) => item.id === $("payment-account").value,
      );
      const amount = moneyInput($("payment-amount").value);
      if (!account || !amount) return;

      // Receipt history does not estimate a loan payoff allocation. Keep the legacy
      // database constraint satisfied by recording loan receipts as unapplied.
      const allocation = account.account_type === "rental"
        ? { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: 0 }
        : { principal: 0, interest: 0, fee: 0, escrow: 0, unapplied: amount };
      const payload = {
        user_id: state.workspaceOwnerId,
        account_id: account.id,
        amount,
        received_date: $("payment-date").value,
        payment_method: $("payment-method").value,
        income_category: account.account_type === "rental"
          ? $("income-category").value
          : "installment",
        principal_amount: allocation.principal,
        interest_amount: allocation.interest,
        fee_amount: allocation.fee,
        escrow_amount: allocation.escrow,
        unapplied_amount: allocation.unapplied,
        memo: $("payment-memo").value.trim() || null,
        source_type: "manual",
      };

      if (state.pendingCorrection?.kind === "payment") {
        let error;
        try {
          ({ error } = await state.client.rpc("pd_correct_transaction", {
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
          }));
        } catch {
          toast("Correction failed; original entry is unchanged. Check your connection and try again.");
          return;
        }
        if (error) {
          toast(`Correction failed; original entry is unchanged. ${error.message}`);
          return;
        }
        closeModal($("payment-modal"));
        try {
          await fetchAll();
        } catch {
          return;
        }
        toast("Payment corrected; original kept in history");
        return;
      }

      let error;
      try {
        ({ error } = await state.client.from("pd_payments").insert(payload));
      } catch {
        toast("Payment couldn't be saved right now. Check your connection and try again.");
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      $("payment-form").reset();
      $("payment-date").value = todayIso();
      $("payment-account").value = account.id;
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        updateAllocationPreview();
        $("payment-amount").focus();
        toast("Payment recorded. Ready for the next entry");
        return;
      }
      closeModal($("payment-modal"));
      toast("Payment recorded");
    }

    function openPayment(accountId, propertyId = null) {
      state.pendingCorrection = null;
      populateFormOptions();
      if (propertyId) {
        fillSelect(
          "payment-account",
          state.accounts
            .filter((account) => account.property_id === propertyId && account.status === "active")
            .map((account) => ({
              value: account.id,
              label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
            })),
          "Choose an account",
        );
      }
      $("payment-form").reset();
      $("payment-modal-title").textContent = "Record payment";
      $("payment-modal").querySelector(".eyebrow").textContent = "PAYMENT ENTRY";
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
        (account) => account.property_id === propertyId && account.status === "active",
      );
      if (!accounts.length) {
        toast("Add an active account before recording a payment");
        return;
      }
      openPayment(accounts.length === 1 ? accounts[0].id : null, propertyId);
    }

    function attachEvents() {
      $("payment-form").addEventListener("submit", savePayment);
      $("payment-account").addEventListener("change", () => {
        prefillPaymentAmount();
        updateAllocationPreview();
      });
      $("payment-amount").addEventListener("input", updateAllocationPreview);
      $("payment-date").addEventListener("change", updateAllocationPreview);
    }

    return {
      updateAllocationPreview,
      prefillPaymentAmount,
      savePayment,
      openPayment,
      openPropertyPayment,
      attachEvents,
    };
  }

  window.PropertyDeskPaymentEntryForm = Object.freeze({ create: createPaymentEntryForm });
})();
