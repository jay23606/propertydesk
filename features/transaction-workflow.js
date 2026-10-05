/* Compose the transaction ledger, correction form, and delegated actions. */
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
    const { renderPayments, attachEvents: attachTransactionViewEvents } =
      window.PropertyDeskTransactionViews.create({
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
      renderPayments,
      attachTransactionViewEvents,
    };
  }

  window.PropertyDeskTransactionWorkflow = Object.freeze({ create });
})();
