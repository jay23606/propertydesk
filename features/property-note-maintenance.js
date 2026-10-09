/* Persist quick-note changes independently of property editing. */
(() => {
  "use strict";

  function create({
    state,
    fetchAll,
    toast,
    repository,
    writeFeedback,
    recordUpdateMaintenance,
  }) {
    const { savePropertyUpdate } = recordUpdateMaintenance.create({
      state,
      fetchAll,
      toast,
      repository,
      writeFeedback,
    });

    function savePropertyQuickNote(propertyId, ownerId, note, onReconciled) {
      const message = note ? "Property note saved" : "Property note removed";
      return savePropertyUpdate({
        propertyId,
        ownerId,
        payload: { notes: note || null },
        failureMessage:
          "Property note result couldn't be confirmed. Reload Properties before retrying.",
        refreshFailureMessage:
          "Property note result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
        retryMessage:
          "Property note result is shown in refreshed Properties. Check it before retrying.",
        onReconciled,
        successMessage: message,
        savedRefreshFailureMessage: note
          ? "Property note was saved, but the workspace could not refresh. Reload to verify it."
          : "Property note was removed, but the workspace could not refresh. Reload to verify it.",
      });
    }

    return Object.freeze({ savePropertyQuickNote });
  }

  window.PropertyDeskPropertyNoteMaintenance = Object.freeze({ create });
})();
