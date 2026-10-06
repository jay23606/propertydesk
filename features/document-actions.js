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
    async function deletePropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      const propertyId = state.selectedPropertyId;
      if (
        !doc ||
        !propertyId ||
        doc.property_id !== propertyId ||
        doc.user_id !== state.workspaceOwnerId
      )
        return;
      if (
        !confirm(
          `Permanently delete “${doc.file_name}” from this property? This cannot be undone.`,
        )
      )
        return;

      let storageError;
      try {
        ({ error: storageError } = await repository.remove(doc.storage_path));
      } catch (error) {
        toast(
          `Agreement removal failed: ${error.message || "Check your connection and try again."}`,
        );
        return;
      }
      if (storageError) {
        toast(`Agreement removal failed: ${storageError.message}`);
        return;
      }
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
        return;
      }
      if (error) {
        toast(
          `File deleted, but its document record could not be removed: ${error.message}`,
        );
        return;
      }

      toast("Agreement deleted");
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(propertyId);
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
