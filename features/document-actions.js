/* Open and delete private property agreements. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm = (message) => window.confirm(message),
    openWindow = (...args) => window.open(...args),
    repository = window.PropertyDeskDocumentRepository.create(
      () => state.client,
    ),
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

    async function openPropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      if (!doc || doc.user_id !== state.workspaceOwnerId) return;
      const viewer = openWindow("about:blank", "_blank");
      if (!viewer) {
        toast(
          "Allow pop-ups to open this agreement; you can also use Download.",
        );
        return;
      }
      viewer.opener = null;
      let data;
      let error;
      try {
        ({ data, error } = await repository.signedUrl(doc.storage_path, 60));
      } catch (requestError) {
        viewer.close();
        toast(
          `Agreement link failed: ${requestError.message || "Check your connection and try again."}`,
        );
        return;
      }
      if (error) {
        viewer.close();
        toast(`Agreement link failed: ${error.message}`);
        return;
      }
      viewer.location.href = data.signedUrl;
    }

    return { deletePropertyDocument, openPropertyDocument };
  }

  window.PropertyDeskDocumentActions = Object.freeze({ create });
})();
