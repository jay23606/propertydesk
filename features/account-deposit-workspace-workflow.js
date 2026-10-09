/* Connect held-deposit services with account detail content and actions. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({
    deposits,
    depositWorkflows,
    accountDetails,
    depositWorkspaceWorkflow,
    accountDetailWorkspaceWorkflow,
    accountDetailContentWorkflow,
    accountDetailActionWorkflow,
    accountDetailActionWorkflows,
  }) {
    const depositWorkspace = depositWorkspaceWorkflow.create({
      details: deposits.details,
      adjustments: deposits.adjustments,
      workflows: depositWorkflows,
    });
    const accountDetailWorkspace = accountDetailWorkspaceWorkflow.create({
      contentWorkflow: accountDetailContentWorkflow,
      actionWorkflow: accountDetailActionWorkflow,
      actionWorkflows: accountDetailActionWorkflows,
      content: {
        ...accountDetails.content,
        depositSectionHTML: depositWorkspace.depositSectionHTML,
      },
      actions: accountDetails.actions,
    });

    return Object.freeze({
      openAccountDetails: accountDetailWorkspace.openAccountDetails,
      attachAccountDetailActionEvents:
        accountDetailWorkspace.attachAccountDetailActionEvents,
      attachDepositAdjustmentEvents:
        depositWorkspace.attachDepositAdjustmentEvents,
    });
  }

  window.PropertyDeskAccountDepositWorkspaceWorkflow = Object.freeze({
    create: createAccountDepositWorkspaceWorkflow,
  });
})();
