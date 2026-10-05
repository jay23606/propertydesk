/* Route delegated document actions from the property detail modal. */
(() => {
  "use strict";

  function createPropertyDetailDocumentEvents({
    $, openPropertyDocument, deletePropertyDocument, uploadPropertyDocument,
  }) {
    function attachEvents() {
      const detailContent = $("property-detail-content");
      detailContent.addEventListener("click", (event) => {
        const openDocument = event.target.closest("[data-open-document]");
        if (openDocument) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyDocument(openDocument.dataset.openDocument);
          return;
        }
        const deleteDocument = event.target.closest("[data-delete-document]");
        if (deleteDocument) {
          deletePropertyDocument(deleteDocument.dataset.deleteDocument);
        }
      });
      detailContent.addEventListener("change", (event) => {
        if (event.target.matches("[data-property-document]")) {
          uploadPropertyDocument(event.target);
        }
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskPropertyDetailDocumentEvents = Object.freeze({
    create: createPropertyDetailDocumentEvents,
  });
})();
