/* Compose the transaction maintenance and records workflows as one feature. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({ maintenance, entries, views }) {
    const transactionMaintenance =
      window.PropertyDeskTransactionMaintenanceWorkflow.create(maintenance);
    return window.PropertyDeskTransactionRecordsWorkflow.create({
      maintenance: transactionMaintenance,
      entries,
      views,
    });
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
