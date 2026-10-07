/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, maintenance }) {
    const details =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const actions = window.PropertyDeskAccountDepositMaintenanceWorkflow.create(
      {
        ...maintenance,
        depositSectionHTML: details.depositSectionHTML,
      },
    );

    return {
      openAccountDetails: details.openAccountDetails,
      depositSectionHTML: details.depositSectionHTML,
      recordDepositAdjustment: actions.recordDepositAdjustment,
      closeAccount: actions.closeAccount,
      attachDepositEvents: actions.attachDepositEvents,
      attachAccountDetailActionEvents: actions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
