/* Compose audited transaction correction writes and correction actions. */
(() => {
  "use strict";

  function createTransactionCorrectionWorkflow(context) {
    const {
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
    } = context;
    const { saveCorrection } = window.PropertyDeskTransactionCorrections.create(
      { $, state, toast, fetchAll, closeModal, repository },
    );

    function createActionHandlers({
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

    return { saveCorrection, createActionHandlers };
  }

  window.PropertyDeskTransactionCorrectionWorkflow = Object.freeze({
    create: createTransactionCorrectionWorkflow,
  });
})();
