/* Connect held-deposit services with account detail content and actions. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({ deposits, accountDetails }) {
    const depositWorkspace =
      window.PropertyDeskDepositWorkspaceWorkflow.create(deposits);
    const accountDetailWorkspace =
      window.PropertyDeskAccountDetailWorkspaceWorkflow.create({
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
