/* Property detail modal actions and delegated account editing. */
(() => {
  "use strict";

  function createPropertyDetailEvents({
    $,
    state,
    closeModal,
    editAccount,
    savePropertyHolders,
    openAccountDetails,
  }) {
    function attachEvents() {
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
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskPropertyDetailEvents = Object.freeze({
    create: createPropertyDetailEvents,
  });
})();
