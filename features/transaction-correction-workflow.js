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
    promptAction,
    EventClass,
    OptionClass,
    repository,
    writeFeedback,
    findCorrectionTarget,
    workflows,
  }) {
    const { saveCorrection } = workflows.maintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
      repository,
      writeFeedback,
    });

    function createCorrectionActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      return workflows.form.create({
        $,
        state,
        toast,
        promptAction,
        prettyType,
        openPayment,
        openExpense,
        updatePaymentGuidance,
        findCorrectionTarget,
        EventClass,
        OptionClass,
        viewModule: workflows.view,
      });
    }

    return Object.freeze({ saveCorrection, createCorrectionActionHandlers });
  }

  window.PropertyDeskTransactionCorrectionWorkflow = Object.freeze({
    create: createTransactionCorrectionWorkflow,
  });
})();
