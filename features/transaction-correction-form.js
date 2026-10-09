/* Validate correction targets and prepare their audited entry workflows. */
(() => {
  "use strict";

  function create({
    $,
    state,
    toast,
    promptAction,
    prettyType,
    openPayment,
    openExpense,
    updatePaymentGuidance,
    EventClass,
    OptionClass,
    findCorrectionTarget,
    viewModule,
  }) {
    const view = viewModule.create({
      $,
      prettyType,
      updatePaymentGuidance,
      EventClass,
      OptionClass,
    });

    function correctTransaction(kind, id) {
      const target = findCorrectionTarget(state, kind, id);
      if (!target) {
        toast("Only posted transactions can be corrected");
        return;
      }

      const reason = promptAction(
        `Why are you correcting this ${kind === "income" ? "income entry" : "expense"}?`,
        "Entered in error",
      );
      if (reason === null) return;
      const auditReason = reason.trim() || "Corrected by owner";

      if (target.kind === "payment") {
        openPayment();
        view.populatePayment(target.record, target.account);
        state.pendingCorrection = { kind: "payment", id, reason: auditReason };
        return;
      }

      openExpense();
      view.populateExpense(target.record);
      state.pendingCorrection = { kind: "expense", id, reason: auditReason };
    }

    return Object.freeze({ correctTransaction });
  }

  window.PropertyDeskTransactionCorrectionForm = Object.freeze({ create });
})();
