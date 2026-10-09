/* Remove agreement storage objects and reconcile their metadata records. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    repository,
    refreshWorkspace,
  }) {
    async function removePropertyDocument(doc, propertyId) {
      if (!(await removeStoredAgreement(doc, propertyId))) return false;
      if (!(await deleteDocumentRecord(doc, propertyId))) return false;
      await refreshDeletedProperty(propertyId);
      return true;
    }

    async function removeStoredAgreement(doc, propertyId) {
      let error;
      try {
        ({ error } = await repository.remove(doc.storage_path));
      } catch (requestError) {
        await refreshAfterStorageRemovalFailure(doc, propertyId, requestError);
        return false;
      }
      if (error) {
        toast(`Agreement removal failed: ${error.message}`);
        return false;
      }
      return true;
    }

    async function refreshAfterStorageRemovalFailure(
      doc,
      propertyId,
      requestError,
    ) {
      const refreshed = await refreshWorkspace({
        fetchAll,
        afterRefresh: () => openPropertyDetails(propertyId),
        toast,
        refreshFailureMessage:
          "Agreement file removal result couldn't be confirmed. Reload property details and check the agreement before retrying.",
      });
      if (!refreshed) return false;
      toast(
        `Agreement file removal result couldn't be confirmed. The agreement record for ${doc.file_name} was kept; verify the file before retrying. ${requestError.message || ""}`,
      );
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
          `File was deleted, but its document record result couldn't be confirmed. ${requestError.message || "Reloading property details to check."}`,
        );
        await refreshAfterDocumentRecordFailure(doc, propertyId);
        return false;
      }
      if (error) {
        toast(
          `File deleted, but its document record could not be removed: ${error.message}`,
        );
        await refreshAfterDocumentRecordFailure(doc, propertyId);
        return false;
      }
      return true;
    }

    async function refreshAfterDocumentRecordFailure(doc, propertyId) {
      let recordRemains = false;
      const refreshed = await refreshWorkspace({
        fetchAll,
        afterRefresh: () => {
          recordRemains = state.documents.some((row) => row.id === doc.id);
          openPropertyDetails(propertyId);
        },
        toast,
        refreshFailureMessage:
          "Agreement file was deleted, but its document record could not be refreshed. Reload property details before retrying.",
      });
      if (!refreshed) return false;
      toast(
        recordRemains
          ? "Agreement file was deleted, but its document record remains. Retry deletion to clear the stale entry."
          : "Agreement deleted",
      );
      return !recordRemains;
    }

    async function refreshDeletedProperty(propertyId) {
      await refreshWorkspace({
        fetchAll,
        beforeRefresh: () => toast("Agreement deleted"),
        afterRefresh: () => openPropertyDetails(propertyId),
        toast,
        refreshFailureMessage:
          "Agreement was deleted, but the workspace could not refresh. Reload to verify its status before trying again.",
      });
    }

    return Object.freeze({ removePropertyDocument });
  }

  window.PropertyDeskDocumentDeleteMaintenance = Object.freeze({ create });
})();
