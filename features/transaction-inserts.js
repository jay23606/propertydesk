/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function runInsert(
      operation,
      failureMessage,
      collection,
      payload,
      completion,
    ) {
      const save = completion
        ? window.PropertyDeskRepositoryWriteFeedback
            .saveAndRefreshWorkspaceRecord
        : window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord;
      return save({
        operation,
        state,
        collection,
        payload,
        fetchAll,
        toast,
        failureMessage,
        refreshFailureMessage: failureMessage,
        retryMessage:
          "Ledger was refreshed. Check it before recording this entry again.",
        ...completion,
      });
    }

    function insertPayment({ payload, failureMessage, completion }) {
      return runInsert(
        () => repository.insertPayment(payload),
        failureMessage,
        "payments",
        payload,
        completion,
      );
    }

    function insertExpense({ payload, failureMessage, completion }) {
      return runInsert(
        () => repository.insertExpense(payload),
        failureMessage,
        "expenses",
        payload,
        completion,
      );
    }

    return Object.freeze({ insertPayment, insertExpense });
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
