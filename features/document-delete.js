/* Delete an owner's agreement and its property-scoped metadata record. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm = (message) => window.confirm(message),
    repository,
  }) {
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

    async function removeStoredAgreement(doc) {
      let error;
      try {
        ({ error } = await repository.remove(doc.storage_path));
      } catch (requestError) {
        toast(
          `Agreement removal failed: ${requestError.message || "Check your connection and try again."}`,
        );
        return false;
      }
      if (error) {
        toast(`Agreement removal failed: ${error.message}`);
        return false;
      }
      return true;
    }

    async function deleteDocumentRecord(doc, propertyId) {
      let error;
      try {
        ({ error } = await repository.deleteMetadata(
          doc.id,
          state.workspaceOwnerId,
          propertyId,
        ));
      } catch (requestError) {
        toast(
          `File deleted, but its document record could not be removed: ${requestError.message || "Check your connection and try again."}`,
        );
        return false;
      }
      if (error) {
        toast(
          `File deleted, but its document record could not be removed: ${error.message}`,
        );
        return false;
      }
      return true;
    }

    async function refreshDeletedProperty(propertyId) {
      toast("Agreement deleted");
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(propertyId);
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
      if (!(await removeStoredAgreement(doc))) return;
      if (!(await deleteDocumentRecord(doc, propertyId))) return;
      await refreshDeletedProperty(propertyId);
    }

    return { deletePropertyDocument };
  }

  window.PropertyDeskDocumentDelete = Object.freeze({ create });
})();
