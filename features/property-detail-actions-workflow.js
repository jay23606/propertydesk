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
      resetAccountForm,
      populateFormOptions,
      openModal,
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
        savePropertyHolders,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActions } =
      window.PropertyDeskPropertyDetailQuickActions.create({
        $,
        state,
        closeModal,
        openPayment,
        openExpense,
        resetAccountForm,
        populateFormOptions,
        openModal,
        toggleArchiveProperty,
      });

    function attachPropertyDetailEvents() {
      attachPropertyDetailContentEvents();
      attachPropertyQuickActions();
    }

    return { attachPropertyDetailEvents };
  }

  window.PropertyDeskPropertyDetailActionsWorkflow = Object.freeze({ create });
})();
