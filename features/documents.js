/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create(context) {
    const {
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      makeId,
      confirm = (message) => window.confirm(message),
      openWindow = (...args) => window.open(...args),
      repository,
    } = context;
    const { uploadPropertyDocument } = window.PropertyDeskDocumentUpload.create(
      {
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        makeId,
        repository,
        describeUpload: window.PropertyDeskDocumentUploadPolicy.describe,
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
