/* Compose private agreement operations with their property-detail event router. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, openPropertyDetails }) {
    const documents = window.PropertyDeskDocuments.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      repository: window.PropertyDeskDocumentRepository.create(
        () => state.client,
      ),
    });
    const { attachEvents } =
      window.PropertyDeskPropertyDetailDocumentEvents.create({
        $,
        uploadPropertyDocument: documents.uploadPropertyDocument,
        deletePropertyDocument: documents.deletePropertyDocument,
        openPropertyDocument: documents.openPropertyDocument,
      });

    return { attachPropertyDocumentEvents: attachEvents };
  }

  window.PropertyDeskPropertyDocumentWorkflow = Object.freeze({ create });
})();
