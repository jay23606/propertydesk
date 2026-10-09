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
      getAccount: content.getAccount,
      getProperty: content.getProperty,
      getPaymentsForAccount: content.getPaymentsForAccount,
      getAgreementVersions: content.getAgreementVersions,
      beginAuditRequest: content.beginAuditRequest,
      isCurrentAuditRequest: content.isCurrentAuditRequest,
      money: content.money,
      fmtDate: content.fmtDate,
      fmtDateTime: content.fmtDateTime,
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
      getAccount: actions.getAccount,
      getCollection: actions.getCollection,
      toast: actions.toast,
      fetchAll: actions.fetchAll,
      closeModal: actions.closeModal,
      editAccount: actions.editAccount,
      openPayment: actions.openPayment,
      repository: actions.repository,
      saveAndRefreshWorkspaceRecord: actions.saveAndRefreshWorkspaceRecord,
      confirmAction: actions.confirmAction,
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
