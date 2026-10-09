/* Validate correction targets and prepare their audited entry workflows. */
(() => {
  "use strict";

  function create({
    $,
    toast,
    promptAction,
    prettyType,
    openPayment,
    openExpense,
    updatePaymentGuidance,
    EventClass,
    OptionClass,
    setPendingCorrection,
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
      const target = findCorrectionTarget(kind, id);
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
        setPendingCorrection({ kind: "payment", id, reason: auditReason });
        return;
      }

      openExpense();
      view.populateExpense(target.record);
      setPendingCorrection({ kind: "expense", id, reason: auditReason });
    }

    return Object.freeze({ correctTransaction });
  }

  window.PropertyDeskTransactionCorrectionForm = Object.freeze({ create });
})();
