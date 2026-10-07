/* Compose archive and action workflows for property details. */
(() => {
  "use strict";

  function createPropertyDetailManagementWorkflow(context) {
    const {
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
    } = context;
    const { toggleArchiveProperty } = window.PropertyDeskPropertyArchive.create(
      {
        state,
        toast,
        fetchAll,
        todayIso,
        openPropertyDetails,
        repository: propertyRepository,
      },
    );
    const { attachEvents: attachPropertyDetailEvents } =
      window.PropertyDeskPropertyDetailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActionEvents } =
      window.PropertyDeskPropertyDetailQuickActions.create({
        $,
        state,
        closeModal,
        openPayment,
        openExpense,
        openAccountForProperty,
        toggleArchiveProperty,
      });
    return {
      attachPropertyDetailEvents,
      attachPropertyQuickActionEvents,
    };
  }

  window.PropertyDeskPropertyDetailManagementWorkflow = Object.freeze({
    create: createPropertyDetailManagementWorkflow,
  });
})();
