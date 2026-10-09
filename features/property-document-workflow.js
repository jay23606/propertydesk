/* Compose private agreement actions with their delegated event router. */
(() => {
  "use strict";

  function createPropertyDocumentWorkflow({
    $,
    getSelectedPropertyId,
    getWorkspaceOwnerId,
    getDocuments,
    toast,
    fetchAll,
    openPropertyDetails,
    repository,
    refreshWorkspace,
    confirm,
    openWindow,
    modules,
    documentsWorkflow,
    documentEventsWorkflow,
  }) {
    const documents = documentsWorkflow.create({
      getSelectedPropertyId,
      getWorkspaceOwnerId,
      getDocuments,
      toast,
      fetchAll,
      openPropertyDetails,
      repository,
      refreshWorkspace,
      confirm,
      openWindow,
      modules,
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
