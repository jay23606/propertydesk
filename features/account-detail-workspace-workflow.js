/* Connect account detail rendering with its modal actions. */
(() => {
  "use strict";

  function createAccountDetailWorkspaceWorkflow({
    content,
    actions,
    actionWorkflow,
    actionWorkflows,
  }) {
    const { openAccountDetails } =
      window.PropertyDeskAccountDetailContentWorkflow.create({
        $: content.$,
        state: content.state,
        money: content.money,
        fmtDate: content.fmtDate,
        esc: content.esc,
        sumPosted: content.sumPosted,
        prettyType: content.prettyType,
        paymentFrequencyLabel: content.paymentFrequencyLabel,
        summarizeAccount: content.summarizeAccount,
        amortizationSchedule: content.amortizationSchedule,
        openModal: content.openModal,
        propertyAddress: content.propertyAddress,
        depositSectionHTML: content.depositSectionHTML,
        accountHistoryRepository: content.accountHistoryRepository,
      });
    const { attachAccountDetailActionEvents } = actionWorkflow.create({
      $: actions.$,
      state: actions.state,
      toast: actions.toast,
      fetchAll: actions.fetchAll,
      closeModal: actions.closeModal,
      editAccount: actions.editAccount,
      openPayment: actions.openPayment,
      repository: actions.repository,
      workflows: actionWorkflows,
    });

    return Object.freeze({
      openAccountDetails,
      attachAccountDetailActionEvents,
    });
  }

  window.PropertyDeskAccountDetailWorkspaceWorkflow = Object.freeze({
    create: createAccountDetailWorkspaceWorkflow,
  });
})();
