/* Calculate the active held security-deposit balance from its source rows. */
(() => {
  "use strict";

  function createDepositLedgerUtils({ isPosted }) {
    function securityDepositBalance(entries, payments, expenses) {
      const paymentById = new Map(payments.map((row) => [row.id, row]));
      const expenseById = new Map(expenses.map((row) => [row.id, row]));
      const active = entries.filter(
        (row) =>
          row.entry_type === "retained" ||
          row.entry_type === "restored" ||
          (row.entry_type === "received" &&
            isPosted(paymentById.get(row.source_payment_id))) ||
          (row.entry_type === "refunded" &&
            isPosted(expenseById.get(row.source_expense_id))),
      );
      const totals = { received: 0, refunded: 0, retained: 0, restored: 0 };
      for (const entry of active)
        totals[entry.entry_type] += Number(entry.amount || 0);
      totals.held =
        totals.received - totals.refunded - totals.retained + totals.restored;
      return { active, totals };
    }

    return { securityDepositBalance };
  }

  globalThis.PropertyDeskDepositLedgerUtils = Object.freeze({
    create: createDepositLedgerUtils,
  });
  if (typeof module !== "undefined" && module.exports)
    module.exports = globalThis.PropertyDeskDepositLedgerUtils;
})();
