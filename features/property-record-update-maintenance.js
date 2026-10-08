/* Share owner-scoped property updates and their refresh reconciliation. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository, writeFeedback }) {
    function savePropertyUpdate({
      propertyId,
      ownerId,
      payload,
      failureMessage,
      refreshFailureMessage,
      retryMessage,
      onReconciled,
      onRefreshed,
      afterRefresh,
      successMessage,
      savedRefreshFailureMessage,
    }) {
      return writeFeedback.saveAndRefreshWorkspaceRecord({
        operation: () => repository.updateOwned(propertyId, ownerId, payload),
        state,
        collection: "properties",
        payload,
        recordId: propertyId,
        fetchAll,
        toast,
        failureMessage,
        refreshFailureMessage,
        retryMessage,
        onReconciled,
        onRefreshed,
        afterRefresh,
        successMessage,
        savedRefreshFailureMessage,
      });
    }

    return Object.freeze({ savePropertyUpdate });
  }

  window.PropertyDeskPropertyRecordUpdateMaintenance = Object.freeze({
    create,
  });
})();
