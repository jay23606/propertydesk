/* Share owner-scoped property updates and their refresh reconciliation. */
(() => {
  "use strict";

  function create({
    getCollection,
    fetchAll,
    toast,
    repository,
    saveAndRefreshWorkspaceRecord,
  }) {
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
      return saveAndRefreshWorkspaceRecord({
        operation: () => repository.updateOwned(propertyId, ownerId, payload),
        getCollection,
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
