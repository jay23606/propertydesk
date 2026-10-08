/* Audited correction writes for posted payments and expenses. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, closeModal, repository }) {
    const correctionTypes = Object.freeze({
      payment: Object.freeze({
        label: "Payment",
        modalId: "payment-modal",
        collection: "payments",
        correctionKey: "correction_of_payment_id",
      }),
      expense: Object.freeze({
        label: "Expense",
        modalId: "expense-modal",
        collection: "expenses",
        correctionKey: "correction_of_expense_id",
      }),
    });

    async function saveCorrection(kind, correction) {
      const type = correctionTypes[kind];
      const pending = state.pendingCorrection;
      if (!type || !pending || pending.kind !== kind) {
        toast("This correction is no longer available.");
        return false;
      }
      const successMessage = `${type.label} corrected; original kept in history`;
      const closeCorrectionForm = () => closeModal($(type.modalId));
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
          isConfirmed: () =>
            (state[type.collection] || []).some(
              (row) => row[type.correctionKey] === pending.id,
            ),
          toast,
          failureMessage:
            "Correction result couldn't be confirmed. Reload transaction history before trying again.",
          errorMessage: (error) =>
            `Correction failed; original entry is unchanged. ${error.message}`,
          refreshFailureMessage:
            "Correction result couldn't be confirmed, and transaction history could not refresh. Reload before trying again.",
          retryMessage:
            "Transaction history was refreshed. Check it before trying the correction again.",
          onSaved: closeCorrectionForm,
          onReconciled: () => {
            closeCorrectionForm();
            toast(successMessage);
          },
          successMessage,
          savedRefreshFailureMessage: `${type.label} correction was saved, but the workspace could not refresh. Reload before trying again.`,
        },
      );
    }

    return Object.freeze({ saveCorrection });
  }

  window.PropertyDeskTransactionCorrectionMaintenance = Object.freeze({
    create,
  });
})();
