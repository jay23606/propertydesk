/* Void posted transactions while preserving their audit history. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    timestamp = () => new Date().toISOString(),
    resolveVoidTarget = window.PropertyDeskTransactionVoidModel
      .resolveVoidTarget,
    buildVoidPayload = window.PropertyDeskTransactionVoidModel.buildVoidPayload,
    repository = window.PropertyDeskTransactionRepository,
  }) {
    async function saveVoidTransaction(kind, id, reason) {
      const target = resolveVoidTarget(kind);
      if (!target) {
        toast("This transaction type can't be voided");
        return;
      }
      let result;
      try {
        result = await repository.voidPosted(state.client, {
          target,
          id,
          payload: buildVoidPayload(reason, timestamp()),
        });
      } catch {
        toast("Transaction couldn't be voided right now. Please try again.");
        return;
      }
      const { data, error } = result;
      if (error) {
        toast(error.message);
        return;
      }
      if (!data) {
        toast("This transaction was already voided or is no longer available.");
        return;
      }
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
