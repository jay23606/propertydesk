/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function saveAccount(payload, accountId, completion) {
      const save = completion
        ? window.PropertyDeskRepositoryWriteFeedback
            .saveAndRefreshWorkspaceRecord
        : window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord;
      return save({
        ...window.PropertyDeskRepositoryWriteFeedback.selectRecordWriteCompletion(
          completion,
        ),
        operation: () => repository.save(payload, accountId),
        state,
        collection: "accounts",
        payload,
        recordId: accountId,
        fetchAll,
        toast,
        failureMessage:
          "Account save result couldn't be confirmed. Reload Properties before trying again.",
        refreshFailureMessage:
          "Account save result couldn't be confirmed, and Properties could not refresh. Reload before trying again.",
        retryMessage:
          "Properties were refreshed. Check the account before trying to save it again.",
      });
    }

    return Object.freeze({ saveAccount });
  }

  window.PropertyDeskAccountFormMaintenance = Object.freeze({ create });
})();
