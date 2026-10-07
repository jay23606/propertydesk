/* Compose audited transaction writes with their correction and void actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceWorkflow(context) {
    const correction = window.PropertyDeskTransactionCorrectionWorkflow.create(
      context.correction,
    );
    const { voidTransaction } =
      window.PropertyDeskTransactionVoidWorkflow.create(context.voiding);

    function createActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      const { correctTransaction } = correction.createActionHandlers({
        openPayment,
        openExpense,
        updatePaymentGuidance,
      });
      const { attachEvents: attachTransactionActionEvents } =
        window.PropertyDeskTransactionViewEvents.create({
          documentRef: context.events.documentRef,
          correctTransaction,
          voidTransaction,
        });
      return { attachTransactionActionEvents };
    }

    return { saveCorrection: correction.saveCorrection, createActionHandlers };
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({
    create: createTransactionMaintenanceWorkflow,
  });
})();
