/* Compose private agreement actions with their delegated event router. */
(() => {
  "use strict";

  function createPropertyDocumentWorkflow({
    $,
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    repository,
    documentsWorkflow,
    documentEventsWorkflow,
  }) {
    const documents = documentsWorkflow.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      repository,
    });
    const { attachPropertyDocumentEvents } = documentEventsWorkflow.create({
      $,
      uploadPropertyDocument: documents.uploadPropertyDocument,
      deletePropertyDocument: documents.deletePropertyDocument,
      openPropertyDocument: documents.openPropertyDocument,
    });

    return Object.freeze({ attachPropertyDocumentEvents });
  }

  window.PropertyDeskPropertyDocumentWorkflow = Object.freeze({
    create: createPropertyDocumentWorkflow,
  });
})();
