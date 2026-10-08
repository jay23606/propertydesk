/* Compose property activity calculations with the activity renderer. */
(() => {
  "use strict";

  function createPropertyActivityDetails({
    state,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
    money,
    fmtDate,
    esc,
  }) {
    const { buildRecentTransactions } =
      window.PropertyDeskPropertyActivityTransactions.create();
    const { buildPropertyActivity } =
      window.PropertyDeskPropertyActivityModel.create({
        state,
        isPosted,
        sumIncome,
        sumOperatingExpenses,
        buildRecentTransactions,
      });
    const { renderRecentActivity } =
      window.PropertyDeskPropertyActivityView.create({
        money,
        fmtDate,
        esc,
      });

    function renderPropertyActivity(propertyId, accounts) {
      const activity = buildPropertyActivity(propertyId, accounts);
      return {
        incomeTotal: activity.incomeTotal,
        expenseTotal: activity.expenseTotal,
        html: renderRecentActivity(activity.transactions),
      };
    }

    return Object.freeze({ renderPropertyActivity });
  }

  window.PropertyDeskPropertyActivityDetails = Object.freeze({
    create: createPropertyActivityDetails,
  });
})();
