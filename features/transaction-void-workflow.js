/* Compose audit-preserving transaction void writes and confirmation actions. */
(() => {
  "use strict";

  function createTransactionVoidWorkflow({
    state,
    toast,
    fetchAll,
    repository,
    resolveVoidTarget,
    buildVoidPayload,
  }) {
    const { saveVoidTransaction } =
      window.PropertyDeskTransactionMaintenance.create({
        state,
        toast,
        fetchAll,
        repository,
        resolveVoidTarget,
        buildVoidPayload,
      });
    const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
      toast,
      saveVoidTransaction,
      resolveVoidTarget,
    });

    return { voidTransaction };
  }

  window.PropertyDeskTransactionVoidWorkflow = Object.freeze({
    create: createTransactionVoidWorkflow,
  });
})();
