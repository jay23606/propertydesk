/* Compose audited transaction writes with their correction and void actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceWorkflow({
    correction: correctionContext,
    voiding: voidingContext,
    events: eventsContext,
    workflows: {
      correction: correctionWorkflow,
      correctionModules,
      voidMaintenance: voidMaintenanceWorkflow,
      voidEntry: voidEntryWorkflow,
      events: maintenanceEventsWorkflow,
    },
  }) {
    const correction = correctionWorkflow.create({
      $: correctionContext.$,
      state: correctionContext.state,
      toast: correctionContext.toast,
      fetchAll: correctionContext.fetchAll,
      closeModal: correctionContext.closeModal,
      prettyType: correctionContext.prettyType,
      EventClass: correctionContext.EventClass,
      OptionClass: correctionContext.OptionClass,
      repository: correctionContext.repository,
      writeFeedback: correctionContext.writeFeedback,
      findCorrectionTarget: correctionContext.findCorrectionTarget,
      workflows: correctionModules,
    });
    const { saveVoidTransaction } = voidMaintenanceWorkflow.create({
      state: voidingContext.state,
      toast: voidingContext.toast,
      fetchAll: voidingContext.fetchAll,
      timestamp: voidingContext.timestamp,
      resolveVoidTarget: voidingContext.resolveVoidTarget,
      buildVoidPayload: voidingContext.buildVoidPayload,
      repository: voidingContext.repository,
      writeFeedback: voidingContext.writeFeedback,
    });
    const { voidTransaction } = voidEntryWorkflow.create({
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
        maintenanceEventsWorkflow.create({
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
