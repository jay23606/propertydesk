/* Delegated actions for the account detail modal. */
(() => {
  "use strict";

  function createAccountDetailEvents({
    $,
    getAccount,
    closeModal,
    editAccount,
    openPayment,
    closeAccount,
  }) {
    function attachAccountDetailActionEvents() {
      $("detail-content").addEventListener("click", (event) => {
        const edit = event.target.closest("[data-account-detail-edit]");
        if (edit) {
          const account = getAccount(edit.dataset.accountDetailEdit);
          if (!account) return;
          closeModal($("detail-modal"));
          editAccount(account);
          return;
        }

        const payment = event.target.closest("[data-account-detail-payment]");
        if (payment) {
          const account = getAccount(payment.dataset.accountDetailPayment);
          if (!account) return;
          closeModal($("detail-modal"));
          openPayment(account.id);
          return;
        }

        const close = event.target.closest("[data-account-detail-close]");
        if (close) {
          const account = getAccount(close.dataset.accountDetailClose);
          if (account) closeAccount(account);
        }
      });
    }

    return Object.freeze({ attachAccountDetailActionEvents });
  }

  window.PropertyDeskAccountDetailEvents = Object.freeze({
    create: createAccountDetailEvents,
  });
})();
