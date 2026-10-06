/* Compose account closure persistence with account detail action routing. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, toast, fetchAll, closeModal, editAccount, openPayment } =
      context;
    const { closeAccount: saveCloseAccount } =
      window.PropertyDeskAccountMaintenance.create({
        state,
        toast,
        fetchAll,
        closeAccountDetails: () => closeModal($("detail-modal")),
      });
    const { closeAccount } = window.PropertyDeskAccountCloseEntry.create({
      saveCloseAccount,
    });
    const { attachEvents } = window.PropertyDeskAccountDetailEvents.create({
      $,
      state,
      closeModal,
      editAccount,
      openPayment,
      closeAccount,
    });

    return { attachEvents };
  }

  window.PropertyDeskAccountDetailActionsWorkflow = Object.freeze({ create });
})();
