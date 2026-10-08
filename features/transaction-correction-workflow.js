/* Compose audited transaction correction writes and correction actions. */
(() => {
  "use strict";

  function createTransactionCorrectionWorkflow({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
    prettyType,
    EventClass = Event,
    OptionClass = Option,
    repository,
    findCorrectionTarget,
  }) {
    const { saveCorrection } =
      window.PropertyDeskTransactionCorrectionMaintenance.create({
        $,
        state,
        toast,
        fetchAll,
        closeModal,
        repository,
      });

    function createCorrectionActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      return window.PropertyDeskTransactionCorrectionForm.create({
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
    }

    return Object.freeze({ saveCorrection, createCorrectionActionHandlers });
  }

  window.PropertyDeskTransactionCorrectionWorkflow = Object.freeze({
    create: createTransactionCorrectionWorkflow,
  });
})();
