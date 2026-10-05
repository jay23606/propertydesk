/* Routes delegated DOM actions to the focused PropertyDesk features. */
(() => {
  "use strict";

  function create({
    $,
    documentRef = document,
    recordDepositAdjustment,
    removeWorkspaceMember,
    savePropertyHolders,
    openPayment,
    resetAccountForm,
    populateFormOptions,
    openModal,
    editPropertyQuickNote,
    openPropertyDetails,
    openPropertyPayment,
    deletePropertyDocument,
    openPropertyDocument,
    closeModal,
    openAccountDetails,
    uploadPropertyDocument,
  }) {
    function attachEvents() {
      documentRef.addEventListener("click", (event) => {
        const depositAdjustment = event.target.closest(
          "[data-deposit-adjustment]",
        );
        if (depositAdjustment) {
          recordDepositAdjustment(
            depositAdjustment.dataset.accountId,
            depositAdjustment.dataset.depositAdjustment,
          );
          return;
        }
        const removeMember = event.target.closest("[data-remove-member]");
        if (removeMember) {
          removeWorkspaceMember(removeMember.dataset.removeMember);
          return;
        }
        if (event.target.closest("[data-save-holders]")) {
          savePropertyHolders();
          return;
        }
        const accountPayment = event.target.closest("[data-account-payment]");
        if (accountPayment) {
          event.preventDefault();
          event.stopPropagation();
          openPayment(accountPayment.dataset.accountPayment);
          return;
        }
        const propertyAccount = event.target.closest("[data-property-account]");
        if (propertyAccount) {
          resetAccountForm();
          populateFormOptions();
          $("account-property").value = propertyAccount.dataset.propertyAccount;
          openModal("account-modal");
          return;
        }
        const propertyNote = event.target.closest("[data-property-note]");
        if (propertyNote) {
          event.preventDefault();
          event.stopPropagation();
          editPropertyQuickNote(propertyNote.dataset.propertyNote);
          return;
        }
        const propertyOpen = event.target.closest("[data-property-open]");
        if (propertyOpen) {
          openPropertyDetails(propertyOpen.dataset.propertyOpen);
          return;
        }
        const quickPayment = event.target.closest("[data-property-payment]");
        if (quickPayment) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyPayment(quickPayment.dataset.propertyPayment);
          return;
        }
        const deleteDocument = event.target.closest("[data-delete-document]");
        if (deleteDocument) {
          deletePropertyDocument(deleteDocument.dataset.deleteDocument);
          return;
        }
        const openDocument = event.target.closest("[data-open-document]");
        if (openDocument) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyDocument(openDocument.dataset.openDocument);
          return;
        }
        const accountDetail = event.target.closest("[data-detail]");
        if (accountDetail) {
          closeModal($("property-detail-modal"));
          openAccountDetails(accountDetail.dataset.detail);
          return;
        }
        const propertyCard = event.target.closest("[data-property-card]");
        if (propertyCard) openPropertyDetails(propertyCard.dataset.propertyCard);
      });

      documentRef.addEventListener("change", (event) => {
        if (event.target.matches("[data-property-document]"))
          uploadPropertyDocument(event.target);
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskActionRouter = Object.freeze({ create });
})();
