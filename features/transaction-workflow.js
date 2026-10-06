/* Compose transaction history and maintenance actions for the ledger screen. */
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
      toast,
      fetchAll,
      prettyType,
      openPayment,
      openExpense,
      updateAllocationPreview,
      EventClass,
      OptionClass,
      documentRef,
    } = context;
    const { renderPayments, attachEvents: attachTransactionEvents } =
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
    const { attachTransactionActionEvents } =
      window.PropertyDeskTransactionMaintenanceWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        prettyType,
        openPayment,
        openExpense,
        updateAllocationPreview,
        EventClass,
        OptionClass,
        documentRef,
      });

    return {
      renderPayments,
      attachTransactionEvents,
      attachTransactionActionEvents,
    };
  }

  window.PropertyDeskTransactionWorkflow = Object.freeze({ create });
})();
