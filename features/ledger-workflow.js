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
      previewReminderEmail,
      saveCorrection,
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
