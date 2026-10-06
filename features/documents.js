/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create(context) {
    const {
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      confirm = (message) => window.confirm(message),
      openWindow = (...args) => window.open(...args),
      repository = window.PropertyDeskDocumentRepository.create(
        () => state.client,
      ),
    } = context;
    const { uploadPropertyDocument } = window.PropertyDeskDocumentUpload.create(
      {
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        makeId: context.makeId,
        repository,
      },
    );

    const { deletePropertyDocument, openPropertyDocument } =
      window.PropertyDeskDocumentActions.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        confirm,
        openWindow,
        repository,
      });

    return {
      uploadPropertyDocument,
      deletePropertyDocument,
      openPropertyDocument,
    };
  }

  window.PropertyDeskDocuments = Object.freeze({ create });
})();
