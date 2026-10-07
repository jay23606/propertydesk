/* Compose transaction history rendering with correction and void actions. */
(() => {
  "use strict";

  function createTransactionScreenWorkflow(context) {
    const {
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      transactionMaintenance,
      openPayment,
      openExpense,
      updatePaymentGuidance,
    } = context;
    const views = window.PropertyDeskTransactionViews.create({
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });
    const { attachTransactionActionEvents } =
      transactionMaintenance.createActionHandlers({
        openPayment,
        openExpense,
        updatePaymentGuidance,
      });

    return {
      renderPayments: views.renderPayments,
      attachTransactionViewEvents: views.attachEvents,
      attachTransactionActionEvents,
    };
  }

  window.PropertyDeskTransactionScreenWorkflow = Object.freeze({
    create: createTransactionScreenWorkflow,
  });
})();
