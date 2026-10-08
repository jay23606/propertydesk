/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    function runInsert(operation, failureMessage, collection, payload) {
      return window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord({
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
      });
    }

    function insertPayment({ payload, failureMessage }) {
      return runInsert(
        () => repository.insertPayment(payload),
        failureMessage,
        "payments",
        payload,
      );
    }

    function insertExpense({ payload, failureMessage }) {
      return runInsert(
        () => repository.insertExpense(payload),
        failureMessage,
        "expenses",
        payload,
      );
    }

    return Object.freeze({ insertPayment, insertExpense });
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
