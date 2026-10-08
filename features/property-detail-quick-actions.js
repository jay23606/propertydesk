/* Bind the property modal's top-level payment, expense, account, and archive actions. */
(() => {
  "use strict";

  function create({
    $,
    state,
    closeModal,
    openPayment,
    openExpense,
    openAccountForProperty,
    toggleArchiveProperty,
  }) {
    function attachEvents() {
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
        openAccountForProperty(propertyId);
      });
      $("property-archive-toggle").addEventListener(
        "click",
        toggleArchiveProperty,
      );
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskPropertyDetailQuickActions = Object.freeze({ create });
})();
