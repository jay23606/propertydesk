/* Build cash-flow totals and recent transaction rows for one property. */
(() => {
  "use strict";

  function createPropertyActivityModel({
    getPayments,
    getExpenses,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
    buildRecentTransactions,
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
      for (const payment of getPayments()) {
        if (!accountIds.has(payment.account_id)) continue;
        (isPosted(payment) ? income : voidedPayments).push(payment);
      }
      for (const expense of getExpenses()) {
        if (expense.property_id !== propertyId) continue;
        (isPosted(expense) ? expenses : voidedExpenses).push(expense);
      }
      const transactions = buildRecentTransactions({
        income,
        voidedPayments,
        expenses,
        voidedExpenses,
        accountById,
      });

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
