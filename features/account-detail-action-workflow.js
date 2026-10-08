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
    workflows: {
      closeMaintenance: closeMaintenanceWorkflow,
      closeEntry: closeEntryWorkflow,
      detailEvents: detailEventsWorkflow,
    },
  }) {
    const { saveCloseAccount } = closeMaintenanceWorkflow.create({
      state,
      toast,
      fetchAll,
      closeAccountDetails: () => closeModal($("detail-modal")),
      repository,
    });
    const { closeAccount } = closeEntryWorkflow.create({
      saveCloseAccount,
    });
    const { attachAccountDetailActionEvents } = detailEventsWorkflow.create({
      $,
      state,
      closeModal,
      editAccount,
      openPayment,
      closeAccount,
    });

    return Object.freeze({ attachAccountDetailActionEvents });
  }

  window.PropertyDeskAccountDetailActionWorkflow = Object.freeze({
    create: createAccountDetailActionWorkflow,
  });
})();
