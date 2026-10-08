/* Connect account detail rendering with its modal actions. */
(() => {
  "use strict";

  function createAccountDetailWorkspaceWorkflow({
    content,
    actions,
    contentWorkflow,
    actionWorkflow,
    actionWorkflows,
  }) {
    const { openAccountDetails } = contentWorkflow.create({
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
      workflows: content.workflows,
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
      writeFeedback: actions.writeFeedback,
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
