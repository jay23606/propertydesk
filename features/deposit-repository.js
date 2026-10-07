/* Persist held-deposit ledger entries. */
(() => {
  "use strict";

  const { insert: insertRecord } = window.PropertyDeskRepositoryQueryUtils;

  function create({ getClient }) {
    function insert(payload) {
      return insertRecord(getClient(), "pd_deposit_entries", payload);
    }

    return Object.freeze({ insert });
  }

  window.PropertyDeskDepositRepository = Object.freeze({ create });
})();
