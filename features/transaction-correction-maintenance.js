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
      const successMessage = `${kind === "payment" ? "Payment" : "Expense"} corrected; original kept in history`;
      return window.PropertyDeskRepositoryWriteFeedback.runAndRefreshWorkspaceChange(
        {
          operation: () =>
            repository.correct({
              kind,
              transactionId: pending.id,
              correction,
              reason: pending.reason,
            }),
          fetchAll,
          isConfirmed: () => correctionWasApplied(kind, pending.id),
          toast,
          failureMessage:
            "Correction result couldn't be confirmed. Reload transaction history before trying again.",
          errorMessage: (error) =>
            `Correction failed; original entry is unchanged. ${error.message}`,
          refreshFailureMessage:
            "Correction result couldn't be confirmed, and transaction history could not refresh. Reload before trying again.",
          retryMessage:
            "Transaction history was refreshed. Check it before trying the correction again.",
          onSaved: () =>
            closeModal(
              $(kind === "payment" ? "payment-modal" : "expense-modal"),
            ),
          onReconciled: () => {
            closeModal(
              $(kind === "payment" ? "payment-modal" : "expense-modal"),
            );
            toast(successMessage);
          },
          successMessage,
          savedRefreshFailureMessage: `${kind === "payment" ? "Payment" : "Expense"} correction was saved, but the workspace could not refresh. Reload before trying again.`,
        },
      );
    }

    return Object.freeze({ saveCorrection });
  }

  window.PropertyDeskTransactionCorrectionMaintenance = Object.freeze({
    create,
  });
})();
