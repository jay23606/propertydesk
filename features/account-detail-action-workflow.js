/* Compose account close persistence with actions in the detail modal. */
(() => {
  "use strict";

  function createAccountDetailActionWorkflow({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
    editAccount,
    openPayment,
    repository,
  }) {
    const { saveCloseAccount } =
      window.PropertyDeskAccountCloseMaintenance.create({
        toast,
        fetchAll,
        closeAccountDetails: () => closeModal($("detail-modal")),
        repository,
      });
    const { closeAccount } = window.PropertyDeskAccountCloseEntry.create({
      saveCloseAccount,
    });
    const { attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openPayment,
        closeAccount,
      });

    return { attachAccountDetailActionEvents };
  }

  window.PropertyDeskAccountDetailActionWorkflow = Object.freeze({
    create: createAccountDetailActionWorkflow,
  });
})();
