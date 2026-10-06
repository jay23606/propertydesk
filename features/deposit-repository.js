/* Persist held-deposit ledger entries. */
(() => {
  "use strict";

  function insert(client, payload) {
    return client.from("pd_deposit_entries").insert(payload);
  }

  window.PropertyDeskDepositRepository = Object.freeze({ insert });
})();
