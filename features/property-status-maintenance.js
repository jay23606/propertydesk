/* Persist archive and restore changes while preserving property history. */
(() => {
  "use strict";

  function create({
    state,
    fetchAll,
    toast,
    repository,
    saveAndRefreshWorkspaceRecord,
    recordUpdateMaintenance,
  }) {
    const { savePropertyUpdate } = recordUpdateMaintenance.create({
      state,
      fetchAll,
      toast,
      repository,
      saveAndRefreshWorkspaceRecord,
    });

    function savePropertyArchive({
      propertyId,
      ownerId,
      archivedAt,
      onRefreshed,
      afterRefresh,
      successMessage,
      savedRefreshFailureMessage,
    }) {
      return savePropertyUpdate({
        propertyId,
        ownerId,
        payload: { archived_at: archivedAt },
        failureMessage:
          "Property status result couldn't be confirmed. Reload Properties before retrying.",
        refreshFailureMessage:
          "Property status result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
        retryMessage:
          "Property status is shown in refreshed details. Check it before retrying.",
        onRefreshed,
        afterRefresh,
        successMessage,
        savedRefreshFailureMessage,
      });
    }

    return Object.freeze({ savePropertyArchive });
  }

  window.PropertyDeskPropertyStatusMaintenance = Object.freeze({ create });
})();
