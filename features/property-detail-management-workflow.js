/* Compose archive, holder, document, and action workflows for property details. */
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
      makeId,
      confirm,
      openWindow,
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
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        repository: window.PropertyDeskPropertyHolderRepository.create({
          getClient: () => state.client,
        }),
      });
    const { attachEvents: attachPropertyHolderEvents } =
      window.PropertyDeskPropertyHolderEvents.create({
        $,
        savePropertyHolders,
      });
    const propertyDocuments = window.PropertyDeskDocuments.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      makeId,
      confirm,
      openWindow,
      repository: window.PropertyDeskDocumentRepository.create(
        () => state.client,
      ),
    });
    const { attachEvents: attachPropertyDocumentEvents } =
      window.PropertyDeskPropertyDetailDocumentEvents.create({
        $,
        uploadPropertyDocument: propertyDocuments.uploadPropertyDocument,
        deletePropertyDocument: propertyDocuments.deletePropertyDocument,
        openPropertyDocument: propertyDocuments.openPropertyDocument,
      });

    return {
      attachPropertyDetailEvents,
      attachPropertyQuickActionEvents,
      attachPropertyHolderEvents,
      attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyDetailManagementWorkflow = Object.freeze({
    create: createPropertyDetailManagementWorkflow,
  });
})();
