/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, maintenance }) {
    const details =
      window.PropertyDeskAccountDetailContentWorkflow.create(content);
    const actions = window.PropertyDeskAccountDepositMaintenanceWorkflow.create(
      {
        $: maintenance.$,
        state: maintenance.state,
        todayIso: maintenance.todayIso,
        toast: maintenance.toast,
        fetchAll: maintenance.fetchAll,
        closeModal: maintenance.closeModal,
        editAccount: maintenance.editAccount,
        openPayment: maintenance.openPayment,
        depositSectionHTML: details.depositSectionHTML,
        moneyInput: maintenance.moneyInput,
      },
    );

    return {
      openAccountDetails: details.openAccountDetails,
      attachDepositEvents: actions.attachDepositEvents,
      attachAccountDetailActionEvents: actions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
