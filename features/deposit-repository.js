/* Persist held-deposit ledger entries. */
(() => {
  "use strict";

  function create({ getClient, queryUtils }) {
    const { insert: insertRecord } = queryUtils;

    function insert(payload) {
      return insertRecord(getClient(), "pd_deposit_entries", payload);
    }

    return Object.freeze({ insert });
  }

  window.PropertyDeskDepositRepository = Object.freeze({ create });
})();
