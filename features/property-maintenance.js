/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function saveProperty(payload, propertyId) {
      return window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord({
        operation: () => repository.save(payload, propertyId),
        state,
        collection: "properties",
        payload,
        recordId: propertyId,
        fetchAll,
        toast,
        failureMessage:
          "Property save result couldn't be confirmed. Reload Properties before trying again.",
        refreshFailureMessage:
          "Property save result couldn't be confirmed, and Properties could not refresh. Reload before trying again.",
        retryMessage:
          "Properties were refreshed. Check the property before trying to save it again.",
      });
    }

    function savePropertyQuickNote(propertyId, ownerId, note, onReconciled) {
      return window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord({
        operation: () =>
          repository.updateOwned(propertyId, ownerId, { notes: note || null }),
        state,
        collection: "properties",
        payload: { notes: note || null },
        recordId: propertyId,
        fetchAll,
        toast,
        failureMessage:
          "Property note result couldn't be confirmed. Reload Properties before retrying.",
        refreshFailureMessage:
          "Property note result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
        retryMessage:
          "Property note result is shown in refreshed Properties. Check it before retrying.",
        onReconciled,
      });
    }

    function savePropertyArchive(propertyId, ownerId, archivedAt, onRefreshed) {
      return window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord({
        operation: () =>
          repository.updateOwned(propertyId, ownerId, {
            archived_at: archivedAt,
          }),
        state,
        collection: "properties",
        payload: { archived_at: archivedAt },
        recordId: propertyId,
        fetchAll,
        toast,
        failureMessage:
          "Property status result couldn't be confirmed. Reload Properties before retrying.",
        refreshFailureMessage:
          "Property status result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
        retryMessage:
          "Property status is shown in refreshed details. Check it before retrying.",
        onRefreshed,
      });
    }

    return Object.freeze({
      saveProperty,
      savePropertyQuickNote,
      savePropertyArchive,
    });
  }

  window.PropertyDeskPropertyMaintenance = Object.freeze({ create });
})();
