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
      documentRef = document,
    } = context;
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        documentRef,
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
    const { attachEvents: attachPropertyDetailContentEvents } =
      window.PropertyDeskPropertyDetailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActions } =
      window.PropertyDeskPropertyDetailQuickActions.create({
        $,
        state,
        closeModal,
        openPayment,
        openExpense,
        openAccountForProperty,
        toggleArchiveProperty,
      });

    function attachPropertyDetailEvents() {
      attachPropertyDetailContentEvents();
      attachPropertyHolderEvents();
      attachPropertyQuickActions();
    }

    return { attachPropertyDetailEvents };
  }

  window.PropertyDeskPropertyDetailActionsWorkflow = Object.freeze({ create });
})();
