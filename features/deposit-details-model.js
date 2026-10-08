/* Prepare rental security-deposit ledger rows for account detail display. */
(() => {
  "use strict";

  function createDepositDetailsModel({ depositLedger }) {
    const labels = {
      received: "Received",
      refunded: "Refunded",
      retained: "Retained",
      restored: "Retention reversed",
    };

    function buildDepositDetails(account) {
      if (account.account_type !== "rental") return null;
      const { entries, active, totals, paymentById, expenseById } =
        depositLedger(account.id);
      const activeIds = new Set(active.map((row) => row.id));
      const rows = entries.map((entry) => {
        return {
          date: entry.movement_date,
          type: labels[entry.entry_type] || entry.entry_type,
          amount: entry.amount,
          reason:
            entry.reason ||
            paymentById.get(entry.source_payment_id)?.memo ||
            expenseById.get(entry.source_expense_id)?.memo ||
            "",
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
