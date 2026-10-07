/* Keep ledger database writes behind one small persistence boundary. */
(() => {
  "use strict";

  const { insert: insertRecord } = window.PropertyDeskRepositoryQueryUtils;

  function create({ getClient }) {
    function insert(table, payload) {
      return insertRecord(getClient(), table, payload);
    }

    function correct({ kind, transactionId, correction, reason }) {
      return getClient().rpc("pd_correct_transaction", {
        p_kind: kind,
        p_transaction_id: transactionId,
        p_correction: correction,
        p_reason: reason,
      });
    }

    function voidPosted({ target, id, payload }) {
      return getClient()
        .from(target.table)
        .update(payload)
        .eq("id", id)
        .eq("status", "posted")
        .select("id")
        .maybeSingle();
    }

    return Object.freeze({ insert, correct, voidPosted });
  }

  window.PropertyDeskTransactionRepository = Object.freeze({ create });
})();
