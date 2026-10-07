/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ toast, repository }) {
    function insertPayment({ payload, failureMessage }) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.insertPayment(payload),
        toast,
        failureMessage,
      });
    }

    function insertExpense({ payload, failureMessage }) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.insertExpense(payload),
        toast,
        failureMessage,
      });
    }

    return { insertPayment, insertExpense };
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
