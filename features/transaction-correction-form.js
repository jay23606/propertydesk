/* Validate correction targets and prepare their audited entry workflows. */
(() => {
  "use strict";

  function create({
    $,
    state,
    toast,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    prettyType,
    openPayment,
    openExpense,
    updateAllocationPreview,
    EventClass = Event,
    OptionClass = Option,
  }) {
    const view = window.PropertyDeskTransactionCorrectionView.create({
      $,
      prettyType,
      updateAllocationPreview,
      EventClass,
      OptionClass,
    });

    function correctTransaction(kind, id) {
      const payment =
          kind === "income"
            ? state.payments.find((item) => item.id === id)
            : null,
        expense =
          kind === "expense"
            ? state.expenses.find((item) => item.id === id)
            : null,
        item = payment || expense;
      if (!item || item.status !== "posted") {
        toast("Only posted transactions can be corrected");
        return;
      }

      const reason = promptAction(
        `Why are you correcting this ${kind === "income" ? "income entry" : "expense"}?`,
        "Entered in error",
      );
      if (reason === null) return;
      const auditReason = reason.trim() || "Corrected by owner";

      if (payment) {
        openPayment();
        const account = state.accounts.find(
          (accountItem) => accountItem.id === payment.account_id,
        );
        view.populatePayment(payment, account);
        state.pendingCorrection = { kind: "payment", id, reason: auditReason };
        return;
      }

      openExpense();
      view.populateExpense(expense);
      state.pendingCorrection = { kind: "expense", id, reason: auditReason };
    }

    return { correctTransaction };
  }

  window.PropertyDeskTransactionCorrectionForm = Object.freeze({ create });
})();
