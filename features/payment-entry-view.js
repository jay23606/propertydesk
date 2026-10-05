/* Build and bind the payment-entry form presentation and launch actions. */
(() => {
  "use strict";

  function createPaymentEntryView(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    } = context;

    function updateAllocationPreview() {
      const account = state.accounts.find(
        (item) => item.id === $("payment-account").value,
      );
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
      if (!Number.isFinite(scheduledAmount) || scheduledAmount <= 0)
        return false;
      amountInput.value = account.payment_amount;
      return true;
    }

    function openPayment(accountId, propertyId = null) {
      state.pendingCorrection = null;
      populateFormOptions();
      if (propertyId) {
        fillSelect(
          "payment-account",
          state.accounts
            .filter(
              (account) =>
                account.property_id === propertyId &&
                account.status === "active",
            )
            .map((account) => ({
              value: account.id,
              label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
            })),
          "Choose an account",
        );
      }
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
        (account) =>
          account.property_id === propertyId && account.status === "active",
      );
      if (!accounts.length) {
        toast("Add an active account before recording a payment");
        return;
      }
      openPayment(accounts.length === 1 ? accounts[0].id : null, propertyId);
    }

    function attachEvents() {
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
      openPayment,
      openPropertyPayment,
      attachEvents,
    };
  }

  window.PropertyDeskPaymentEntryView = Object.freeze({
    create: createPaymentEntryView,
  });
})();
