/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    makeId,
    confirm = (message) => window.confirm(message),
    openWindow = (...args) => window.open(...args),
    repository,
    writeFeedback,
  }) {
    const { uploadPropertyDocument } = window.PropertyDeskDocumentUpload.create(
      {
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        makeId,
        repository,
        writeFeedback,
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
        writeFeedback,
      });

    return Object.freeze({
      uploadPropertyDocument,
      deletePropertyDocument,
      openPropertyDocument,
    });
  }

  window.PropertyDeskDocuments = Object.freeze({ create });
})();
