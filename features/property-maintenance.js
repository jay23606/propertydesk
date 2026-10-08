/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ toast, repository }) {
    function updateProperty(propertyId, ownerId, values, failureMessage) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.updateOwned(propertyId, ownerId, values),
        toast,
        failureMessage,
      });
    }

    function saveProperty(payload, propertyId) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.save(payload, propertyId),
        toast,
        failureMessage:
          "Property couldn't be saved right now. Check your connection and try again.",
      });
    }

    function savePropertyQuickNote(propertyId, ownerId, note) {
      return updateProperty(
        propertyId,
        ownerId,
        { notes: note || null },
        "Property note couldn't be saved right now. Check your connection and try again.",
      );
    }

    function savePropertyArchive(propertyId, ownerId, archivedAt) {
      return updateProperty(
        propertyId,
        ownerId,
        { archived_at: archivedAt },
        "Property status couldn't be updated right now. Check your connection and try again.",
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
