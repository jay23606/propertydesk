/* Resolve posted ledger rows that can be corrected from transaction history. */
(() => {
  "use strict";

  function findCorrectionTarget(state, kind, id) {
    if (kind === "income") {
      const payment = state.payments.find((item) => item.id === id);
      if (!payment || payment.status !== "posted") return null;
      return {
        kind: "payment",
        record: payment,
        account: state.accounts.find(
          (account) => account.id === payment.account_id,
        ),
      };
    }

    if (kind === "expense") {
      const expense = state.expenses.find((item) => item.id === id);
      if (!expense || expense.status !== "posted") return null;
      return { kind: "expense", record: expense };
    }

    return null;
  }

  window.PropertyDeskTransactionCorrectionModel = Object.freeze({
    findCorrectionTarget,
  });
})();
