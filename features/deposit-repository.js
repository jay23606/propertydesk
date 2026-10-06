/* Persist held-deposit ledger entries. */
(() => {
  "use strict";

  const { insert: insertRecord } = window.PropertyDeskRepositoryQueryUtils;

  function insert(client, payload) {
    return insertRecord(client, "pd_deposit_entries", payload);
  }

  window.PropertyDeskDepositRepository = Object.freeze({ insert });
})();
