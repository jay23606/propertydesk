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
      repository,
      resolveVoidTarget,
      buildVoidPayload,
      findCorrectionTarget,
    } = context;
    const { saveCorrection } = window.PropertyDeskTransactionCorrections.create(
      {
        $,
        state,
        toast,
        fetchAll,
        closeModal,
        repository,
      },
    );
    const { saveVoidTransaction } =
      window.PropertyDeskTransactionMaintenance.create({
        state,
        toast,
        fetchAll,
        repository,
        resolveVoidTarget,
        buildVoidPayload,
      });
    const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
      toast,
      saveVoidTransaction,
      resolveVoidTarget,
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
          findCorrectionTarget,
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
