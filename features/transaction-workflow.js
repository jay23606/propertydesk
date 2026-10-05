/* Compose the transaction ledger, correction form, and delegated actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses, toast, prettyType, openPayment,
      openExpense, updateAllocationPreview, EventClass, OptionClass, fetchAll,
      documentRef = document,
    } = context;
    const { voidTransaction } = window.PropertyDeskTransactionMaintenance.create({
      state, toast, fetchAll,
    });
    const {
      renderPayments,
      attachEvents: attachTransactionViewEvents,
    } = window.PropertyDeskTransactionViews.create({
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses,
    });
    const { correctTransaction } =
      window.PropertyDeskTransactionCorrectionForm.create({
        $, state, toast, prettyType, openPayment, openExpense,
        updateAllocationPreview, EventClass, OptionClass,
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
