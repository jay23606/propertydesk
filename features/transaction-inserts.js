/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ toast, repository }) {
    function runInsert(operation, failureMessage) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation,
        toast,
        failureMessage,
      });
    }

    function insertPayment({ payload, failureMessage }) {
      return runInsert(() => repository.insertPayment(payload), failureMessage);
    }

    function insertExpense({ payload, failureMessage }) {
      return runInsert(() => repository.insertExpense(payload), failureMessage);
    }

    return { insertPayment, insertExpense };
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
