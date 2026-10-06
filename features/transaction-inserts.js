/* Share posted transaction insert and error handling across ledger entries. */
(() => {
  "use strict";

  function create({ state, toast }) {
    async function insertTransaction({ table, payload, failureMessage }) {
      let error;
      try {
        ({ error } = await state.client.from(table).insert(payload));
      } catch {
        toast(failureMessage);
        return false;
      }
      if (error) {
        toast(error.message);
        return false;
      }
      return true;
    }

    return { insertTransaction };
  }

  window.PropertyDeskTransactionInserts = Object.freeze({ create });
})();
