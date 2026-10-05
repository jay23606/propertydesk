/* Delegated actions for the account detail modal. */
(() => {
  "use strict";

  function createAccountDetailEvents({
    $,
    state,
    closeModal,
    editAccount,
    openPayment,
    closeAccount,
  }) {
    function attachEvents() {
      $("detail-content").addEventListener("click", (event) => {
        const edit = event.target.closest("[data-account-detail-edit]");
        if (edit) {
          const account = state.accounts.find((item) => item.id === edit.dataset.accountDetailEdit);
          if (!account) return;
          closeModal($("detail-modal"));
          editAccount(account);
          return;
        }

        const payment = event.target.closest("[data-account-detail-payment]");
        if (payment) {
          const account = state.accounts.find((item) => item.id === payment.dataset.accountDetailPayment);
          if (!account) return;
          closeModal($("detail-modal"));
          openPayment(account.id);
          return;
        }

        const close = event.target.closest("[data-account-detail-close]");
        if (close) {
          const account = state.accounts.find((item) => item.id === close.dataset.accountDetailClose);
          if (account) closeAccount(account);
        }
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskAccountDetailEvents = Object.freeze({
    create: createAccountDetailEvents,
  });
})();
