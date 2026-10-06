/* Coordinate record entry with the transaction history view. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      fillSelect,
      prettyType,
      openModal,
      navigate,
      previewReminderEmail,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      documentRef = document,
    } = context;
    const { saveCorrection } = window.PropertyDeskTransactionCorrections.create(
      {
        $,
        state,
        toast,
        fetchAll,
        closeModal,
      },
    );
    const entries = window.PropertyDeskRecordEntryWorkflow.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      fillSelect,
      prettyType,
      openModal,
      navigate,
      previewReminderEmail,
      saveCorrection,
      documentRef,
    });
    const transactions = window.PropertyDeskTransactionViews.create({
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
    return { entries, transactions };
  }

  window.PropertyDeskLedgerWorkflow = Object.freeze({ create });
})();
