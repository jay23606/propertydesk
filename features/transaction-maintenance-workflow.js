/* Compose audited transaction writes with their correction and void actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceWorkflow({
    correction: correctionContext,
    voiding: voidingContext,
    events: eventsContext,
  }) {
    const correction = window.PropertyDeskTransactionCorrectionWorkflow.create({
      $: correctionContext.$,
      state: correctionContext.state,
      toast: correctionContext.toast,
      fetchAll: correctionContext.fetchAll,
      closeModal: correctionContext.closeModal,
      prettyType: correctionContext.prettyType,
      EventClass: correctionContext.EventClass,
      OptionClass: correctionContext.OptionClass,
      repository: correctionContext.repository,
      findCorrectionTarget: correctionContext.findCorrectionTarget,
    });
    const { saveVoidTransaction } =
      window.PropertyDeskTransactionVoidMaintenance.create({
        state: voidingContext.state,
        toast: voidingContext.toast,
        fetchAll: voidingContext.fetchAll,
        timestamp: voidingContext.timestamp,
        resolveVoidTarget: voidingContext.resolveVoidTarget,
        buildVoidPayload: voidingContext.buildVoidPayload,
        repository: voidingContext.repository,
      });
    const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
      toast: voidingContext.toast,
      saveVoidTransaction,
      resolveVoidTarget: voidingContext.resolveVoidTarget,
    });

    function createTransactionActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      const { correctTransaction } = correction.createCorrectionActionHandlers({
        openPayment,
        openExpense,
        updatePaymentGuidance,
      });
      const { attachTransactionActionEvents } =
        window.PropertyDeskTransactionMaintenanceEvents.create({
          documentRef: eventsContext.documentRef,
          correctTransaction,
          voidTransaction,
        });
      return Object.freeze({ attachTransactionActionEvents });
    }

    return Object.freeze({
      saveCorrection: correction.saveCorrection,
      createTransactionActionHandlers,
    });
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({
    create: createTransactionMaintenanceWorkflow,
  });
})();
