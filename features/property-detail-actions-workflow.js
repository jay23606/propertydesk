/* Compose property-detail administration and modal actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      toast,
      fetchAll,
      todayIso,
      openPropertyDetails,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      openAccountForProperty,
      openAccountDetails,
    } = context;
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
      });
    const { attachEvents: attachPropertyHolderEvents } =
      window.PropertyDeskPropertyHolderEvents.create({
        $,
        savePropertyHolders,
      });
    const { toggleArchiveProperty } = window.PropertyDeskPropertyArchive.create(
      {
        state,
        toast,
        fetchAll,
        todayIso,
        openPropertyDetails,
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
      attachPropertyHolderEvents,
      attachPropertyQuickActionEvents,
    };
  }

  window.PropertyDeskPropertyDetailActionsWorkflow = Object.freeze({ create });
})();
