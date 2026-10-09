/* Route delegated account edit and detail actions in the property modal. */
(() => {
  "use strict";

  function createPropertyDetailEvents({
    $,
    getAccount,
    closeModal,
    editAccount,
    openAccountDetails,
  }) {
    function attachEvents() {
      const detailContent = $("property-detail-content");
      detailContent.addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-account]");
        if (button) {
          const account = getAccount(button.dataset.editAccount);
          if (!account) return;
          event.preventDefault();
          closeModal($("property-detail-modal"));
          editAccount(account);
          return;
        }
        const accountDetail = event.target.closest("[data-detail]");
        if (accountDetail) {
          closeModal($("property-detail-modal"));
          openAccountDetails(accountDetail.dataset.detail);
          return;
        }
      });
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskPropertyDetailEvents = Object.freeze({
    create: createPropertyDetailEvents,
  });
})();
