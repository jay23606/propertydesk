/* Connect account details and actions with the rental deposit workspace. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({
    deposit,
    accountDetails,
    accountActions,
  }) {
    const depositWorkspace =
      window.PropertyDeskDepositWorkspaceWorkflow.create(deposit);
    const { openAccountDetails } =
      window.PropertyDeskAccountDetailContentWorkflow.create({
        ...accountDetails,
        depositSectionHTML: depositWorkspace.depositSectionHTML,
      });
    const { attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailActionWorkflow.create(accountActions);

    return {
      attachAccountDetailActionEvents,
      attachDepositAdjustmentEvents:
        depositWorkspace.attachDepositAdjustmentEvents,
      openAccountDetails,
    };
  }

  window.PropertyDeskAccountDepositWorkspaceWorkflow = Object.freeze({
    create: createAccountDepositWorkspaceWorkflow,
  });
})();
