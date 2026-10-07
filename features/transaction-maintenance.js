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
          "Transaction couldn't be voided right now. Please try again.",
        resultFailureMessage: ({ data }) =>
          data
            ? null
            : "This transaction was already voided or is no longer available.",
      });
      if (!saved) return;
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast("Transaction voided; original entry preserved");
      return true;
    }

    return { saveVoidTransaction };
  }

  window.PropertyDeskTransactionMaintenance = Object.freeze({ create });
})();
