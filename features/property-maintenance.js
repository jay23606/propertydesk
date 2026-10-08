/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function updateProperty(
      propertyId,
      ownerId,
      values,
      failureMessage,
      onUnconfirmed,
    ) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.updateOwned(propertyId, ownerId, values),
        toast,
        failureMessage,
        onUnconfirmed,
      });
    }

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

    function savePropertyQuickNote(propertyId, ownerId, note, onUnconfirmed) {
      return updateProperty(
        propertyId,
        ownerId,
        { notes: note || null },
        "Property note result couldn't be confirmed. Reload Properties before retrying.",
        onUnconfirmed,
      );
    }

    function savePropertyArchive(
      propertyId,
      ownerId,
      archivedAt,
      onUnconfirmed,
    ) {
      return updateProperty(
        propertyId,
        ownerId,
        { archived_at: archivedAt },
        "Property status result couldn't be confirmed. Reload Properties before retrying.",
        onUnconfirmed,
      );
    }

    return Object.freeze({
      saveProperty,
      savePropertyQuickNote,
      savePropertyArchive,
    });
  }

  window.PropertyDeskPropertyMaintenance = Object.freeze({ create });
})();
