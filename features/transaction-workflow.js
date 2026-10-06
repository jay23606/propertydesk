/* Compose the transaction history view. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    } = context;
    const views = window.PropertyDeskTransactionViews.create({
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });

    return {
      renderPayments: views.renderPayments,
      attachEvents: views.attachEvents,
    };
  }

  window.PropertyDeskTransactionWorkflow = Object.freeze({ create });
})();
