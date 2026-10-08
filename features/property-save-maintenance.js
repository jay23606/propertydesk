/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function saveProperty(payload, propertyId, completion) {
      const save = completion
        ? window.PropertyDeskRepositoryWriteFeedback
            .saveAndRefreshWorkspaceRecord
        : window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord;
      return save({
        ...window.PropertyDeskWorkspaceRecordWriteWorkflow.selectRecordWriteCompletion(
          completion,
        ),
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

    return Object.freeze({ saveProperty });
  }

  window.PropertyDeskPropertySaveMaintenance = Object.freeze({ create });
})();
