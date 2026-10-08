/* Void posted transactions while preserving their audit history. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    timestamp = () => new Date().toISOString(),
    resolveVoidTarget,
    buildVoidPayload,
    repository,
  }) {
    async function saveVoidTransaction(kind, id, reason) {
      const target = resolveVoidTarget(kind);
      if (!target) {
        toast("This transaction type can't be voided");
        return;
      }
      const payload = buildVoidPayload(reason, timestamp());
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () =>
          repository.voidPosted({
            target,
            id,
            payload,
          }),
        toast,
        failureMessage:
          "Transaction void result couldn't be confirmed. Reload transaction history before trying again.",
        resultFailureMessage: ({ data }) =>
          data
            ? null
            : "This transaction was already voided or is no longer available.",
        onUnconfirmed: async () => {
          let voidWasApplied = false;
          const refreshed =
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => {
                const rows =
                  state?.[kind === "income" ? "payments" : "expenses"] || [];
                voidWasApplied = rows.some(
                  (row) =>
                    row.id === id &&
                    row.status === payload.status &&
                    row.voided_at === payload.voided_at &&
                    row.void_reason === payload.void_reason,
                );
              },
              toast,
              refreshFailureMessage:
                "Transaction void result couldn't be confirmed, and transaction history could not refresh. Reload before trying again.",
            });
          if (!refreshed) return false;
          if (!voidWasApplied) {
            toast(
              "Transaction history was refreshed. Check it before trying to void this entry again.",
            );
            return false;
          }
          reconciled = true;
          toast("Transaction voided; original entry preserved");
          return true;
        },
      });
      if (!saved) return;
      if (reconciled) return true;
      if (
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          toast,
          successMessage: "Transaction voided; original entry preserved",
          refreshFailureMessage:
            "Transaction was voided, but the workspace could not refresh. Reload to verify its status before making another change.",
        })
      )
        return true;
    }

    return Object.freeze({ saveVoidTransaction });
  }

  window.PropertyDeskTransactionVoidMaintenance = Object.freeze({ create });
})();
