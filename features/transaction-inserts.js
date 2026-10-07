/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ toast, repository }) {
    function insertTransaction({ table, payload, failureMessage }) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.insert(table, payload),
        toast,
        failureMessage,
      });
    }

    return { insertTransaction };
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
