/* Bind the property modal's top-level payment, expense, account, and archive actions. */
(() => {
  "use strict";

  function create({
    $, state, closeModal, openPayment, openExpense, resetAccountForm,
    populateFormOptions, openModal,
  }) {
    function attachEvents(toggleArchiveProperty) {
      $("property-detail-add-income").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        openPayment(null, propertyId);
      });
      $("property-detail-add-expense").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        openExpense(propertyId);
      });
      $("property-detail-add-account").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        resetAccountForm();
        populateFormOptions();
        $("account-property").value = propertyId;
        openModal("account-modal");
      });
      $("property-archive-toggle").addEventListener(
        "click",
        toggleArchiveProperty,
      );
    }

    return { attachEvents };
  }

  window.PropertyDeskPropertyDetailQuickActions = Object.freeze({ create });
})();
