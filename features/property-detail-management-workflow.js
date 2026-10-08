/* Compose archive and action workflows for property details. */
(() => {
  "use strict";

  function createPropertyDetailManagementWorkflow({
    $,
    state,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
    closeModal,
    editAccount,
    openAccountDetails,
    openPayment,
    openExpense,
    openAccountForProperty,
    propertyRepository,
    writeFeedback,
    workflows,
  }) {
    const { toggleArchiveProperty } = workflows.archive.create({
      state,
      toast,
      fetchAll,
      todayIso,
      openPropertyDetails,
      repository: propertyRepository,
      writeFeedback,
    });
    const { attachEvents: attachPropertyDetailEvents } =
      workflows.detailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActionEvents } =
      workflows.quickActions.create({
        $,
        state,
        closeModal,
        openPayment,
        openExpense,
        openAccountForProperty,
        toggleArchiveProperty,
      });
    return Object.freeze({
      attachPropertyDetailEvents,
      attachPropertyQuickActionEvents,
    });
  }

  window.PropertyDeskPropertyDetailManagementWorkflow = Object.freeze({
    create: createPropertyDetailManagementWorkflow,
  });
})();
