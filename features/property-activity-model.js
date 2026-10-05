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
      const income = state.payments.filter(
        (payment) => accountIds.has(payment.account_id) && isPosted(payment),
      );
      const accountPayments = state.payments.filter((payment) =>
        accountIds.has(payment.account_id),
      );
      const allExpenses = state.expenses.filter(
        (expense) => expense.property_id === propertyId,
      );
      const expenses = allExpenses.filter(isPosted);
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
        ...accountPayments
          .filter((payment) => !isPosted(payment))
          .map((item) => ({
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
        ...allExpenses
          .filter((expense) => !isPosted(expense))
          .map((item) => ({
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

    return { buildPropertyActivity };
  }

  window.PropertyDeskPropertyActivityModel = Object.freeze({
    create: createPropertyActivityModel,
  });
})();
