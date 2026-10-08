/* Compose the transaction maintenance and records workflows as one feature. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({ maintenance, entries, views }) {
    const transactionMaintenance =
      window.PropertyDeskTransactionMaintenanceWorkflow.create({
        correction: maintenance.correction,
        voiding: maintenance.voiding,
        events: maintenance.events,
        workflows: {
          correction: window.PropertyDeskTransactionCorrectionWorkflow,
          voidMaintenance: window.PropertyDeskTransactionVoidMaintenance,
          voidEntry: window.PropertyDeskTransactionVoidEntry,
          events: window.PropertyDeskTransactionMaintenanceEvents,
        },
      });
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
