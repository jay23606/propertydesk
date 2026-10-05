/* Compose the transaction table with its audited correction and void actions. */
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
      documentRef = document,
    } = context;
    const maintenance =
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

    function attachEvents() {
      views.attachEvents();
      maintenance.attachTransactionActionEvents();
    }

    return {
      renderPayments: views.renderPayments,
      attachEvents,
    };
  }

  window.PropertyDeskTransactionWorkflow = Object.freeze({ create });
})();
