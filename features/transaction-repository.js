/* Keep ledger database writes behind one small persistence boundary. */
(() => {
  "use strict";

  function insert(client, table, payload) {
    return client.from(table).insert(payload);
  }

  function correct(client, { kind, transactionId, correction, reason }) {
    return client.rpc("pd_correct_transaction", {
      p_kind: kind,
      p_transaction_id: transactionId,
      p_correction: correction,
      p_reason: reason,
    });
  }

  function voidPosted(client, { target, id, payload }) {
    return client
      .from(target.table)
      .update(payload)
      .eq("id", id)
      .eq("status", "posted")
      .select("id")
      .maybeSingle();
  }

  window.PropertyDeskTransactionRepository = Object.freeze({
    insert,
    correct,
    voidPosted,
  });
})();
