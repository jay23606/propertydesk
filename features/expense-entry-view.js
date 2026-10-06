/* Build and bind the property-expense form presentation and launch action. */
(() => {
  "use strict";

  function createExpenseEntryView(context) {
    const {
      $,
      state,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    } = context;

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

    return { openExpense, attachEvents };
  }

  window.PropertyDeskExpenseEntryView = Object.freeze({
    create: createExpenseEntryView,
  });
})();
