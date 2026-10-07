/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, accountActions, deposit }) {
    const details =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const accountDetailActions =
      window.PropertyDeskAccountDetailActionWorkflow.create(accountActions);
    const depositActions = window.PropertyDeskDepositAdjustmentWorkflow.create({
      $: deposit.$,
      state: deposit.state,
      todayIso: deposit.todayIso,
      toast: deposit.toast,
      fetchAll: deposit.fetchAll,
      depositSectionHTML: details.depositSectionHTML,
      moneyInput: deposit.moneyInput,
      repository: deposit.repository,
      prepareAdjustment: deposit.prepareAdjustment,
      validateAdjustment: deposit.validateAdjustment,
    });

    return {
      openAccountDetails: details.openAccountDetails,
      attachDepositAdjustmentEvents:
        depositActions.attachDepositAdjustmentEvents,
      attachAccountDetailActionEvents:
        accountDetailActions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
