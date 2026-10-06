/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    repository = window.PropertyDeskTransactionRepository,
  }) {
    function insertTransaction({ table, payload, failureMessage }) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.insert(state.client, table, payload),
        toast,
        failureMessage,
      });
    }

    return { insertTransaction };
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
