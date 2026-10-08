/* Compose the transaction maintenance and records workflows as one feature. */
(() => {
  "use strict";

  function createTransactionWorkspaceWorkflow({
    maintenance,
    entries,
    views,
    maintenanceWorkflows,
    recordWorkflows,
    workflows,
  }) {
    const transactionMaintenance = workflows.maintenance.create({
      correction: maintenance.correction,
      voiding: maintenance.voiding,
      events: maintenance.events,
      workflows: maintenanceWorkflows,
    });
    return workflows.records.create({
      maintenance: transactionMaintenance,
      entries,
      views,
      workflows: recordWorkflows,
    });
  }

  window.PropertyDeskTransactionWorkspaceWorkflow = Object.freeze({
    create: createTransactionWorkspaceWorkflow,
  });
})();
