/* Compose property notes, holders, documents, and detail-modal actions. */
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
    const {
      uploadPropertyDocument,
      deletePropertyDocument,
      openPropertyDocument,
    } = window.PropertyDeskDocuments.create({
      state, toast, fetchAll, openPropertyDetails,
      repository: window.PropertyDeskDocumentRepository.create(state.client),
    });
    const { attachEvents: attachPropertyDetailEvents } =
      window.PropertyDeskPropertyDetailEvents.create({
        $, state, closeModal, editAccount, openPayment, openExpense,
        resetAccountForm, populateFormOptions, openModal, savePropertyHolders,
        openAccountDetails, deletePropertyDocument, openPropertyDocument,
        uploadPropertyDocument,
      });

    return {
      editPropertyQuickNote,
      savePropertyHolders,
      toggleArchiveProperty,
      uploadPropertyDocument,
      deletePropertyDocument,
      openPropertyDocument,
      attachPropertyDetailEvents,
    };
  }

  window.PropertyDeskPropertyActionsWorkflow = Object.freeze({ create });
})();
