/* Persist workspace records from forms without owning their presentation. */
(() => {
  "use strict";

  function create({
    state,
    fetchAll,
    toast,
    repository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
    collection,
    recordLabel,
  }) {
    function saveRecord(payload, recordId, completion) {
      const save = completion
        ? saveAndRefreshWorkspaceRecord
        : saveWorkspaceRecord;
      return save({
        ...selectRecordWriteCompletion(completion),
        operation: () => repository.save(payload, recordId),
        state,
        collection,
        payload,
        recordId,
        fetchAll,
        toast,
        failureMessage: `${recordLabel} save result couldn't be confirmed. Reload Properties before trying again.`,
        refreshFailureMessage: `${recordLabel} save result couldn't be confirmed, and Properties could not refresh. Reload before trying again.`,
        retryMessage: `Properties were refreshed. Check the ${recordLabel.toLowerCase()} before trying to save it again.`,
      });
    }

    return Object.freeze({ saveRecord });
  }

  window.PropertyDeskWorkspaceRecordSaveMaintenance = Object.freeze({
    create,
  });
})();
