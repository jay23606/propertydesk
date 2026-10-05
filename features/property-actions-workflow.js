/* Compose property administration and detail-modal actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, toast, fetchAll, todayIso, streetAddress, openPropertyDetails,
      closeModal, editAccount, openPayment, openExpense, resetAccountForm,
      populateFormOptions, openModal, openAccountDetails, documentRef = document,
    } = context;
    const { editPropertyQuickNote } = window.PropertyDeskPropertyQuickNote.create({
      state, toast, fetchAll, streetAddress,
    });
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state, toast, fetchAll, openPropertyDetails, documentRef,
      });
    const { toggleArchiveProperty } = window.PropertyDeskPropertyArchive.create({
      state, toast, fetchAll, todayIso, openPropertyDetails,
    });
    const { attachEvents: attachPropertyDetailContentEvents } =
      window.PropertyDeskPropertyDetailEvents.create({
        $, state, closeModal, editAccount, savePropertyHolders,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActions } =
      window.PropertyDeskPropertyDetailQuickActions.create({
        $, state, closeModal, openPayment, openExpense, resetAccountForm,
        populateFormOptions, openModal,
      });

    function attachPropertyDetailEvents(toggleArchiveProperty) {
      attachPropertyDetailContentEvents();
      attachPropertyQuickActions(toggleArchiveProperty);
    }

    return {
      editPropertyQuickNote,
      toggleArchiveProperty,
      attachPropertyDetailEvents,
    };
  }

  window.PropertyDeskPropertyActionsWorkflow = Object.freeze({ create });
})();
