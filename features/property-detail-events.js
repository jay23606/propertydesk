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
    savePropertyHolders,
    openAccountDetails,
    deletePropertyDocument,
    openPropertyDocument,
    uploadPropertyDocument,
  }) {
    function attachEvents(toggleArchiveProperty) {
      const detailContent = $("property-detail-content");
      detailContent.addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-account]");
        if (button) {
          const account = state.accounts.find(
            (item) => item.id === button.dataset.editAccount,
          );
          if (!account) return;
          event.preventDefault();
          closeModal($("property-detail-modal"));
          editAccount(account);
          return;
        }
        if (event.target.closest("[data-save-holders]")) {
          savePropertyHolders();
          return;
        }
        const accountDetail = event.target.closest("[data-detail]");
        if (accountDetail) {
          closeModal($("property-detail-modal"));
          openAccountDetails(accountDetail.dataset.detail);
          return;
        }
        const openDocument = event.target.closest("[data-open-document]");
        if (openDocument) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyDocument(openDocument.dataset.openDocument);
          return;
        }
        const deleteDocument = event.target.closest("[data-delete-document]");
        if (deleteDocument) {
          deletePropertyDocument(deleteDocument.dataset.deleteDocument);
        }
      });
      detailContent.addEventListener("change", (event) => {
        if (event.target.matches("[data-property-document]")) {
          uploadPropertyDocument(event.target);
        }
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
