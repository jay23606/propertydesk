/* Audited correction writes for posted payments and expenses. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, closeModal, repository }) {
    async function saveCorrection(kind, correction) {
      const pending = state.pendingCorrection;
      if (!pending || pending.kind !== kind) {
        toast("This correction is no longer available.");
        return false;
      }
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
          "Correction failed; original entry is unchanged. Check your connection and try again.",
        errorMessage: (error) =>
          `Correction failed; original entry is unchanged. ${error.message}`,
      });
      if (!saved) return false;
      closeModal($(kind === "payment" ? "payment-modal" : "expense-modal"));
      return window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: `${kind === "payment" ? "Payment" : "Expense"} corrected; original kept in history`,
      });
    }

    return { saveCorrection };
  }

  window.PropertyDeskTransactionCorrectionMaintenance = Object.freeze({
    create,
  });
})();
