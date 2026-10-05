/* Property detail modal actions and delegated account editing. */
(() => {
  "use strict";

  function createPropertyDetailEvents({
    $,
    state,
    closeModal,
    editAccount,
    openPayment,
    openExpense,
    resetAccountForm,
    populateFormOptions,
    openModal,
  }) {
    function attachEvents(toggleArchiveProperty) {
      $("property-detail-content").addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-account]");
        if (!button) return;
        const account = state.accounts.find(
          (item) => item.id === button.dataset.editAccount,
        );
        if (!account) return;
        event.preventDefault();
        closeModal($("property-detail-modal"));
        editAccount(account);
      });

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

  window.PropertyDeskPropertyDetailEvents = Object.freeze({
    create: createPropertyDetailEvents,
  });
})();
