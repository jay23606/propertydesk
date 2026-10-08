/* Prepare rental security-deposit ledger rows for account detail display. */
(() => {
  "use strict";

  function createDepositDetailsModel({ state, depositLedger }) {
    const labels = {
      received: "Received",
      refunded: "Refunded",
      retained: "Retained",
      restored: "Retention reversed",
    };

    function buildDepositDetails(account) {
      if (account.account_type !== "rental") return null;
      const { entries, active, totals } = depositLedger(account.id);
      const activeIds = new Set(active.map((row) => row.id));
      const payments = new Map(
        state.payments.map((payment) => [payment.id, payment]),
      );
      const expenses = new Map(
        state.expenses.map((expense) => [expense.id, expense]),
      );
      const rows = entries.map((entry) => {
        const payment = payments.get(entry.source_payment_id);
        const expense = expenses.get(entry.source_expense_id);
        return {
          date: entry.movement_date,
          type: labels[entry.entry_type] || entry.entry_type,
          amount: entry.amount,
          reason: entry.reason || payment?.memo || expense?.memo || "",
          active: activeIds.has(entry.id),
        };
      });

      return {
        accountId: account.id,
        rows,
        totals,
        canReverseRetention: totals.retained > totals.restored,
      };
    }

    return Object.freeze({ buildDepositDetails });
  }

  window.PropertyDeskDepositDetailsModel = Object.freeze({
    create: createDepositDetailsModel,
  });
})();
