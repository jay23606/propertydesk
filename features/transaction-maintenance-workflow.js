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

    return { voidTransaction, correctTransaction };
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({ create });
})();
