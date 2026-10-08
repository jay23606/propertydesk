/* Audited correction writes for posted payments and expenses. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, closeModal, repository }) {
    function correctionWasApplied(kind, transactionId) {
      const rows = state[kind === "payment" ? "payments" : "expenses"] || [];
      const correctionKey =
        kind === "payment"
          ? "correction_of_payment_id"
          : "correction_of_expense_id";
      return rows.some((row) => row[correctionKey] === transactionId);
    }

    async function saveCorrection(kind, correction) {
      const pending = state.pendingCorrection;
      if (!pending || pending.kind !== kind) {
        toast("This correction is no longer available.");
        return false;
      }
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () =>
          repository.correct({
            kind,
            transactionId: pending.id,
            correction,
            reason: pending.reason,
          }),
        toast,
        failureMessage:
          "Correction result couldn't be confirmed. Reload transaction history before trying again.",
        errorMessage: (error) =>
          `Correction failed; original entry is unchanged. ${error.message}`,
        onUnconfirmed: () =>
          window.PropertyDeskRepositoryWriteFeedback.reconcileWorkspaceChange({
            fetchAll,
            isConfirmed: () => correctionWasApplied(kind, pending.id),
            toast,
            refreshFailureMessage:
              "Correction result couldn't be confirmed, and transaction history could not refresh. Reload before trying again.",
            retryMessage:
              "Transaction history was refreshed. Check it before trying the correction again.",
            onConfirmed: () => {
              reconciled = true;
              closeModal(
                $(kind === "payment" ? "payment-modal" : "expense-modal"),
              );
              toast(
                `${kind === "payment" ? "Payment" : "Expense"} corrected; original kept in history`,
              );
            },
          }),
      });
      if (!saved) return false;
      if (reconciled) return true;
      closeModal($(kind === "payment" ? "payment-modal" : "expense-modal"));
      return window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: `${kind === "payment" ? "Payment" : "Expense"} corrected; original kept in history`,
        refreshFailureMessage: `${kind === "payment" ? "Payment" : "Expense"} correction was saved, but the workspace could not refresh. Reload before trying again.`,
      });
    }

    return Object.freeze({ saveCorrection });
  }

  window.PropertyDeskTransactionCorrectionMaintenance = Object.freeze({
    create,
  });
})();
