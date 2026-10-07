/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, accountActions, deposit }) {
    const details =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const accountDetailActions =
      window.PropertyDeskAccountDetailActionWorkflow.create(accountActions);
    const depositActions = window.PropertyDeskDepositAdjustmentWorkflow.create({
      ...deposit,
      depositSectionHTML: details.depositSectionHTML,
    });

    return {
      openAccountDetails: details.openAccountDetails,
      attachDepositEvents: depositActions.attachDepositEvents,
      attachAccountDetailActionEvents:
        accountDetailActions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
