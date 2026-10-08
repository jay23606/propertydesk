/* Void posted transactions while preserving their audit history. */
(() => {
  "use strict";

  function create({
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
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () =>
          repository.voidPosted({
            target,
            id,
            payload: buildVoidPayload(reason, timestamp()),
          }),
        toast,
        failureMessage:
          "Transaction void result couldn't be confirmed. Reload transaction history before trying again.",
        resultFailureMessage: ({ data }) =>
          data
            ? null
            : "This transaction was already voided or is no longer available.",
      });
      if (!saved) return;
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
