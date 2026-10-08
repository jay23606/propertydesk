/* Persist agreement files and reconcile uncertain metadata writes. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, openPropertyDetails, repository }) {
    async function uploadFile(path, file, contentType) {
      let error;
      try {
        ({ error } = await repository.upload(path, file, contentType));
      } catch (requestError) {
        const cleaned = await removeUploadedFile(path);
        toast(
          cleaned
            ? `Agreement upload result couldn't be confirmed. Any uploaded private file was removed. ${requestError.message || "You can retry the upload."}`
            : `Agreement upload result couldn't be confirmed, and private file cleanup couldn't be verified. Check storage before retrying. ${requestError.message || ""}`,
        );
        return false;
      }
      if (error) {
        toast(`Agreement upload failed: ${error.message}`);
        return false;
      }
      return true;
    }

    async function saveDocumentMetadata(propertyId, file, path, contentType) {
      const metadata = {
        user_id: state.workspaceOwnerId,
        property_id: propertyId,
        account_id: null,
        file_name: file.name,
        storage_path: path,
        content_type: file.type || contentType,
        file_size: file.size,
      };
      let error;
      try {
        ({ error } = await repository.insertMetadata(metadata));
      } catch (requestError) {
        return reconcileUnconfirmedMetadata(propertyId, metadata, requestError);
      }
      if (error) {
        const cleaned = await removeUploadedFile(path);
        toast(
          `Agreement record failed${cleaned ? "; uploaded file removed" : "; uploaded file may need cleanup"}. ${error.message}`,
        );
        return false;
      }
      return true;
    }

    async function reconcileUnconfirmedMetadata(propertyId, metadata, error) {
      let recordWasSaved = false;
      const refreshed =
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          afterRefresh: () => {
            recordWasSaved = state.documents.some(
              (document) =>
                document.user_id === metadata.user_id &&
                document.property_id === propertyId &&
                document.storage_path === metadata.storage_path,
            );
            if (recordWasSaved) openPropertyDetails(propertyId);
          },
          toast,
          refreshFailureMessage:
            "Agreement record result couldn't be confirmed, and Properties could not refresh. The private file was kept; reload property details before retrying.",
        });
      if (!refreshed) return false;
      if (recordWasSaved) {
        toast("Agreement uploaded privately");
        return "reconciled";
      }

      const cleaned = await removeUploadedFile(metadata.storage_path);
      toast(
        cleaned
          ? `Agreement record was not saved; uploaded file removed. You can retry the upload. ${error.message || ""}`
          : `Agreement record was not found after refresh, but private file cleanup couldn't be verified. Check storage before retrying. ${error.message || ""}`,
      );
      return false;
    }

    async function removeUploadedFile(path) {
      try {
        const { error } = await repository.remove(path);
        return !error;
      } catch {
        return false;
      }
    }

    return Object.freeze({ uploadFile, saveDocumentMetadata });
  }

  window.PropertyDeskDocumentUploadMaintenance = Object.freeze({ create });
})();
