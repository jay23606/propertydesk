/* Compose account close persistence with actions in the detail modal. */
(() => {
  "use strict";

  function createAccountDetailActionWorkflow({
    $,
    getAccount,
    getCollection,
    toast,
    fetchAll,
    closeModal,
    editAccount,
    openPayment,
    repository,
    saveAndRefreshWorkspaceRecord,
    confirmAction,
    workflows: {
      closeMaintenance: closeMaintenanceWorkflow,
      closeEntry: closeEntryWorkflow,
      detailEvents: detailEventsWorkflow,
    },
  }) {
    const { saveCloseAccount } = closeMaintenanceWorkflow.create({
      getCollection,
      toast,
      fetchAll,
      closeAccountDetails: () => closeModal($("detail-modal")),
      repository,
      saveAndRefreshWorkspaceRecord,
    });
    const { closeAccount } = closeEntryWorkflow.create({
      saveCloseAccount,
      confirmAction,
    });
    const { attachAccountDetailActionEvents } = detailEventsWorkflow.create({
      $,
      getAccount,
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
