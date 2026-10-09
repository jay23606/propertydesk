/* Compose audited transaction correction writes and correction actions. */
(() => {
  "use strict";

  function createTransactionCorrectionWorkflow({
    $,
    getPendingCorrection,
    setPendingCorrection,
    getPayments,
    getExpenses,
    toast,
    fetchAll,
    closeModal,
    prettyType,
    promptAction,
    EventClass,
    OptionClass,
    repository,
    runAndRefreshWorkspaceChange,
    findCorrectionTarget,
    workflows,
  }) {
    const { saveCorrection } = workflows.maintenance.create({
      $,
      getPendingCorrection,
      getPayments,
      getExpenses,
      toast,
      fetchAll,
      closeModal,
      repository,
      runAndRefreshWorkspaceChange,
    });

    function createCorrectionActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    }) {
      return workflows.form.create({
        $,
        setPendingCorrection,
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
