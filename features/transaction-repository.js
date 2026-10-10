/* Keep ledger database writes behind one small persistence boundary. */
(() => {
  "use strict";

  const VOID_TABLES = Object.freeze({
    income: "pd_payments",
    expense: "pd_expenses",
  });

  function create({ getClient, queryUtils }) {
    const { insert: insertRecord } = queryUtils;

    function insertPayment(payload) {
      return insertRecord(getClient(), "pd_payments", payload);
    }

    function insertExpense(payload) {
      return insertRecord(getClient(), "pd_expenses", payload);
    }

    function correct({ kind, transactionId, correction, reason }) {
      return getClient().rpc("pd_correct_transaction", {
        p_kind: kind,
        p_transaction_id: transactionId,
        p_correction: correction,
        p_reason: reason,
      });
    }

    function voidPosted({ kind, id, payload }) {
      const table = VOID_TABLES[kind];
      if (!table) throw new Error("Unsupported transaction kind.");

      return getClient()
        .from(table)
        .update(payload)
        .eq("id", id)
        .eq("status", "posted")
        .select("id")
        .maybeSingle();
    }

    return Object.freeze({
      insertPayment,
      insertExpense,
      correct,
      voidPosted,
    });
  }

  window.PropertyDeskTransactionRepository = Object.freeze({ create });
})();
