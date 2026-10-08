/* Project property income and expenses into recent activity rows. */
(() => {
  "use strict";

  function createPropertyActivityTransactions() {
    function buildRecentTransactions({
      income,
      voidedPayments,
      expenses,
      voidedExpenses,
      accountById,
    }) {
      return [
        ...income.map((item) => ({
          date: item.received_date,
          kind:
            item.income_category === "deposit" ? "Security deposit" : "Income",
          label: accountById.get(item.account_id)?.name || "Payment",
          amount: Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...voidedPayments.map((item) => ({
          date: item.received_date,
          kind: "Income · voided",
          label: accountById.get(item.account_id)?.name || "Payment",
          amount: Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...expenses.map((item) => ({
          date: item.expense_date,
          kind: "Expense",
          label: item.payee || item.category || "Expense",
          amount: -Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...voidedExpenses.map((item) => ({
          date: item.expense_date,
          kind: "Expense · voided",
          label: item.payee || item.category || "Expense",
          amount: -Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
      ]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 8);
    }

    return Object.freeze({ buildRecentTransactions });
  }

  window.PropertyDeskPropertyActivityTransactions = Object.freeze({
    create: createPropertyActivityTransactions,
  });
})();
