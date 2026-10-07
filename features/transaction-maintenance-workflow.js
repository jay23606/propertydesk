/* Compose audited transaction writes with their correction and void actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceWorkflow(context) {
    const {
      $,
      state,
      toast,
      fetchAll,
      closeModal,
      prettyType,
      EventClass = Event,
      OptionClass = Option,
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
    const { saveVoidTransaction } =
      window.PropertyDeskTransactionMaintenance.create({
        state,
        toast,
        fetchAll,
      });
    const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
      toast,
      saveVoidTransaction,
    });

    function createActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      const { correctTransaction } =
        window.PropertyDeskTransactionCorrectionForm.create({
          $,
          state,
          toast,
          prettyType,
          openPayment,
          openExpense,
          updatePaymentGuidance,
          EventClass,
          OptionClass,
        });
      const { attachEvents } = window.PropertyDeskTransactionViewEvents.create({
        documentRef,
        correctTransaction,
        voidTransaction,
      });
      return { attachEvents };
    }

    return { saveCorrection, createActionHandlers };
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({
    create: createTransactionMaintenanceWorkflow,
  });
})();
