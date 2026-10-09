/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({
    getCollection,
    fetchAll,
    toast,
    repository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
  }) {
    function runInsert(
      operation,
      failureMessage,
      collection,
      payload,
      completion,
    ) {
      const save = completion
        ? saveAndRefreshWorkspaceRecord
        : saveWorkspaceRecord;
      return save({
        ...selectRecordWriteCompletion(completion),
        operation,
        getCollection,
        collection,
        payload,
        fetchAll,
        toast,
        failureMessage,
        refreshFailureMessage: failureMessage,
        retryMessage:
          "Ledger was refreshed. Check it before recording this entry again.",
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
