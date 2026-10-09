/* Confirm agreement deletion before delegating its persistence workflow. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm = (message) => window.confirm(message),
    repository,
    writeFeedback,
    maintenanceModule,
  }) {
    const { removePropertyDocument } = maintenanceModule.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      repository,
      writeFeedback,
    });

    function documentForDeletion(id, propertyId) {
      const doc = state.documents.find((item) => item.id === id);
      if (
        doc &&
        propertyId &&
        doc.property_id === propertyId &&
        doc.user_id === state.workspaceOwnerId
      )
        return doc;
      return null;
    }

    async function deletePropertyDocument(id) {
      const propertyId = state.selectedPropertyId;
      const doc = documentForDeletion(id, propertyId);
      if (!doc) return;
      if (
        !confirm(
          `Permanently delete “${doc.file_name}” from this property? This cannot be undone.`,
        )
      )
        return;
      return removePropertyDocument(doc, propertyId);
    }

    return Object.freeze({ deletePropertyDocument });
  }

  window.PropertyDeskDocumentDelete = Object.freeze({ create });
})();
