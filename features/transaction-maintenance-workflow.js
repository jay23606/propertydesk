/* Compose audited transaction corrections and void actions. */
(() => {
  "use strict";

  function create(context) {
    const {
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
      documentRef = document,
    } = context;
    const { voidTransaction } =
      window.PropertyDeskTransactionMaintenance.create({
        state,
        toast,
        fetchAll,
      });
    const { correctTransaction } =
      window.PropertyDeskTransactionCorrectionForm.create({
        $,
        state,
        toast,
        prettyType,
        openPayment,
        openExpense,
        updateAllocationPreview,
        EventClass,
        OptionClass,
      });
    const { attachEvents: attachTransactionActionEvents } =
      window.PropertyDeskTransactionViewEvents.create({
        documentRef, correctTransaction, voidTransaction,
      });

    return { voidTransaction, correctTransaction, attachTransactionActionEvents };
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({ create });
})();
