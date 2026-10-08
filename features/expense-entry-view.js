/* Build and bind the property-expense form presentation and launch action. */
(() => {
  "use strict";

  function createExpenseEntryView({
    $,
    state,
    moneyInput,
    todayIso,
    fillSelect,
    populateFormOptions,
    prettyType,
    openModal,
    expenseAccountPolicy,
  }) {
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

    function readValues() {
      return {
        propertyId: $("expense-property").value,
        accountId: $("expense-account").value,
        amount: moneyInput($("expense-amount").value),
        expenseDate: $("expense-date").value,
        category: $("expense-category").value,
        payee: $("expense-payee").value.trim(),
        paymentMethod: $("expense-method").value,
        memo: $("expense-memo").value.trim(),
      };
    }

    function resetAfterSave() {
      $("expense-form").reset();
      $("expense-date").value = todayIso();
    }

    function prepareNextExpense({
      propertyId,
      accountId,
      category,
      payee,
      paymentMethod,
    }) {
      $("expense-property").value = propertyId;
      $("expense-property").dispatchEvent(new Event("change"));
      $("expense-account").value = accountId;
      $("expense-category").value = category;
      $("expense-payee").value = payee;
      $("expense-method").value = paymentMethod;
      $("expense-amount").focus();
    }

    function attachEvents() {
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
          !expenseAccountPolicy.requiresRentalAccount(
            $("expense-category").value,
          ),
        );
      });
    }

    return Object.freeze({
      attachEvents,
      openExpense,
      prepareNextExpense,
      readValues,
      resetAfterSave,
    });
  }

  window.PropertyDeskExpenseEntryView = Object.freeze({
    create: createExpenseEntryView,
  });
})();
