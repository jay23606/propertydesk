/* Compose audited transaction writes with their correction and void actions. */
(() => {
  "use strict";

  function createTransactionMaintenanceWorkflow(context) {
    const correction = window.PropertyDeskTransactionCorrectionWorkflow.create(
      context.correction,
    );
    const { saveVoidTransaction } =
      window.PropertyDeskTransactionMaintenance.create(context.voiding);
    const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
      toast: context.voiding.toast,
      saveVoidTransaction,
      resolveVoidTarget: context.voiding.resolveVoidTarget,
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
        window.PropertyDeskTransactionViewEvents.create({
          documentRef: context.events.documentRef,
          correctTransaction,
          voidTransaction,
        });
      return { attachTransactionActionEvents };
    }

    return {
      saveCorrection: correction.saveCorrection,
      createTransactionActionHandlers,
    };
  }

  window.PropertyDeskTransactionMaintenanceWorkflow = Object.freeze({
    create: createTransactionMaintenanceWorkflow,
  });
})();
