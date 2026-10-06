/* Coordinate record entry, transaction history, and transaction maintenance. */
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
      EventClass,
      OptionClass,
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
    const transactions = window.PropertyDeskTransactionWorkflow.create({
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
      openPayment: entries.openPayment,
      openExpense: entries.openExpense,
      updateAllocationPreview: entries.updateAllocationPreview,
      EventClass,
      OptionClass,
      documentRef,
    });
    return { entries, transactions };
  }

  window.PropertyDeskLedgerWorkflow = Object.freeze({ create });
})();
