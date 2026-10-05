/* Compose the transaction ledger, correction form, and delegated actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses, correctTransaction,
      voidTransaction, documentRef = document,
    } = context;
    const {
      renderPayments,
      attachEvents: attachTransactionViewEvents,
    } = window.PropertyDeskTransactionViews.create({
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses,
    });
    const { attachEvents: attachTransactionActionEvents } =
      window.PropertyDeskTransactionViewEvents.create({
        documentRef, correctTransaction, voidTransaction,
      });

    return {
      renderPayments,
      attachTransactionViewEvents,
      attachTransactionActionEvents,
    };
  }

  window.PropertyDeskTransactionWorkflow = Object.freeze({ create });
})();
