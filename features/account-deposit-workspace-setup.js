/* Wire account detail and security-deposit workspaces from scoped dependencies. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    const contexts = workflows.contextSetup.create({
      records,
      ui,
      services,
      workflows: {
        adjustmentModel: workflows.adjustmentModel,
        accountDetails: {
          contentModules: workflows.accountDetails.contentModules,
        },
      },
    });
    return workflows.workspace.create({
      depositWorkspaceWorkflow: workflows.deposit.workspace,
      depositWorkflows: {
        detailsModel: workflows.deposit.detailsModel,
        detailsView: workflows.deposit.detailsView,
        adjustmentWorkflow: workflows.deposit.adjustmentWorkflow,
        adjustmentModules: workflows.deposit.adjustmentModules,
      },
      accountDetailWorkspaceWorkflow: workflows.accountDetails.workspace,
      accountDetailContentWorkflow: workflows.accountDetails.content,
      accountDetailActionWorkflow: workflows.accountDetails.action,
      accountDetailActionWorkflows: workflows.accountDetails.actionWorkflows,
      ...contexts,
    });
  }

  window.PropertyDeskAccountDepositWorkspaceSetup = Object.freeze({
    create: createAccountDepositWorkspaceSetup,
  });
})();
