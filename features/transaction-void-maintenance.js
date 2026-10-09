/* Void posted transactions while preserving their audit history. */
(() => {
  "use strict";

  function create({
    getPayments,
    getExpenses,
    toast,
    fetchAll,
    timestamp,
    resolveVoidTarget,
    buildVoidPayload,
    repository,
    runAndRefreshWorkspaceChange,
  }) {
    async function saveVoidTransaction(kind, id, reason) {
      const target = resolveVoidTarget(kind);
      if (!target) {
        toast("This transaction type can't be voided");
        return;
      }
      const payload = buildVoidPayload(reason, timestamp());
      const successMessage = "Transaction voided; original entry preserved";
      const saved = await runAndRefreshWorkspaceChange({
        operation: () =>
          repository.voidPosted({
            target,
            id,
            payload,
          }),
        fetchAll,
        isConfirmed: () => {
          const rows =
            target.collection === "payments" ? getPayments() : getExpenses();
          return rows.some(
            (row) =>
              row.id === id &&
              row.status === payload.status &&
              row.voided_at === payload.voided_at &&
              row.void_reason === payload.void_reason,
          );
        },
        toast,
        failureMessage:
          "Transaction void result couldn't be confirmed. Reload transaction history before trying again.",
        resultFailureMessage: ({ data }) =>
          data
            ? null
            : "This transaction was already voided or is no longer available.",
        refreshFailureMessage:
          "Transaction void result couldn't be confirmed, and transaction history could not refresh. Reload before trying again.",
        retryMessage:
          "Transaction history was refreshed. Check it before trying to void this entry again.",
        onReconciled: () => toast(successMessage),
        successMessage,
        savedRefreshFailureMessage:
          "Transaction was voided, but the workspace could not refresh. Reload to verify its status before making another change.",
      });
      return saved || undefined;
    }

    return Object.freeze({ saveVoidTransaction });
  }

  window.PropertyDeskTransactionVoidMaintenance = Object.freeze({ create });
})();
