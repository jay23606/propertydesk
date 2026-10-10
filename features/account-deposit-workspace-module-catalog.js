/* Collect the workflow modules owned by account details and deposits. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceModuleCatalog() {
    return Object.freeze({
      workspace: window.PropertyDeskAccountDepositWorkspaceWorkflow,
      contextSetup: window.PropertyDeskAccountDepositContextSetup,
      deposit: {
        workspace: window.PropertyDeskDepositWorkspaceWorkflow,
        detailsModel: window.PropertyDeskDepositDetailsModel,
        detailsView: window.PropertyDeskDepositDetailsView,
        adjustmentWorkflow: window.PropertyDeskDepositAdjustmentWorkflow,
        adjustmentModules: {
          maintenance: window.PropertyDeskDepositMaintenance,
          entry: window.PropertyDeskDepositAdjustmentEntry,
          events: window.PropertyDeskDepositDetailEvents,
        },
      },
      accountDetails: {
        workspace: window.PropertyDeskAccountDetailWorkspaceWorkflow,
        content: window.PropertyDeskAccountDetailContentWorkflow,
        action: window.PropertyDeskAccountDetailActionWorkflow,
        actionWorkflows: {
          closeMaintenance: window.PropertyDeskAccountCloseMaintenance,
          closeEntry: window.PropertyDeskAccountCloseEntry,
          detailEvents: window.PropertyDeskAccountDetailEvents,
        },
        contentModules: {
          accountHistoryModel: window.PropertyDeskAccountHistoryModel,
          accountHistoryView: window.PropertyDeskAccountHistoryView,
          accountLoanScheduleView: window.PropertyDeskAccountLoanScheduleView,
          accountDetailsView: window.PropertyDeskAccountDetailsView,
          accountDetailsModel: window.PropertyDeskAccountDetailsModel,
          accountDetails: window.PropertyDeskAccountDetails,
        },
      },
      adjustmentModel: window.PropertyDeskDepositAdjustmentModel,
    });
  }

  window.PropertyDeskAccountDepositWorkspaceModuleCatalog = Object.freeze({
    create: createAccountDepositWorkspaceModuleCatalog,
  });
})();
