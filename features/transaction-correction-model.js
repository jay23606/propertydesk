/* Resolve posted ledger rows that can be corrected from transaction history. */
(() => {
  "use strict";

  function createTransactionCorrectionModel({
    getPayments,
    getExpenses,
    getAccounts,
  }) {
    function findCorrectionTarget(kind, id) {
      if (kind === "income") {
        const payment = getPayments().find((item) => item.id === id);
        if (!payment || payment.status !== "posted") return null;
        return {
          kind: "payment",
          record: payment,
          account: getAccounts().find(
            (account) => account.id === payment.account_id,
          ),
        };
      }

      if (kind === "expense") {
        const expense = getExpenses().find((item) => item.id === id);
        if (!expense || expense.status !== "posted") return null;
        return { kind: "expense", record: expense };
      }

      return null;
    }

    return Object.freeze({ findCorrectionTarget });
  }

  window.PropertyDeskTransactionCorrectionModel = Object.freeze({
    create: createTransactionCorrectionModel,
  });
})();
