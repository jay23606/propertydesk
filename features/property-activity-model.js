/* Build cash-flow totals and recent transaction rows for one property. */
(() => {
  "use strict";

  function createPropertyActivityModel({
    state,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
  }) {
    function buildPropertyActivity(propertyId, accounts) {
      const accountIds = new Set(accounts.map((account) => account.id));
      const accountById = new Map(
        accounts.map((account) => [account.id, account]),
      );
      const income = [],
        voidedPayments = [],
        expenses = [],
        voidedExpenses = [];
      for (const payment of state.payments) {
        if (!accountIds.has(payment.account_id)) continue;
        (isPosted(payment) ? income : voidedPayments).push(payment);
      }
      for (const expense of state.expenses) {
        if (expense.property_id !== propertyId) continue;
        (isPosted(expense) ? expenses : voidedExpenses).push(expense);
      }
      const transactions = [
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

      return {
        incomeTotal: sumIncome(income),
        expenseTotal: sumOperatingExpenses(expenses),
        transactions,
      };
    }

    return Object.freeze({ buildPropertyActivity });
  }

  window.PropertyDeskPropertyActivityModel = Object.freeze({
    create: createPropertyActivityModel,
  });
})();
