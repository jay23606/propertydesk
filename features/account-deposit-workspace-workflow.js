/* Connect held-deposit services with account detail content and actions. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({
    deposits,
    depositWorkflows,
    accountDetails,
    depositWorkspaceWorkflow,
    accountDetailWorkspaceWorkflow,
    accountDetailContentWorkflow,
    accountDetailActionWorkflow,
    accountDetailActionWorkflows,
  }) {
    const depositWorkspace = depositWorkspaceWorkflow.create({
      details: deposits.details,
      adjustments: deposits.adjustments,
      workflows: depositWorkflows,
    });
    const accountDetailWorkspace = accountDetailWorkspaceWorkflow.create({
      contentWorkflow: accountDetailContentWorkflow,
      actionWorkflow: accountDetailActionWorkflow,
      actionWorkflows: accountDetailActionWorkflows,
      content: {
        $: accountDetails.content.$,
        getAccount: accountDetails.content.getAccount,
        getProperty: accountDetails.content.getProperty,
        getPaymentsForAccount: accountDetails.content.getPaymentsForAccount,
        getAgreementVersions: accountDetails.content.getAgreementVersions,
        beginAuditRequest: accountDetails.content.beginAuditRequest,
        isCurrentAuditRequest: accountDetails.content.isCurrentAuditRequest,
        money: accountDetails.content.money,
        fmtDate: accountDetails.content.fmtDate,
        fmtDateTime: accountDetails.content.fmtDateTime,
        esc: accountDetails.content.esc,
        sumPosted: accountDetails.content.sumPosted,
        prettyType: accountDetails.content.prettyType,
        paymentFrequencyLabel: accountDetails.content.paymentFrequencyLabel,
        summarizeAccount: accountDetails.content.summarizeAccount,
        amortizationSchedule: accountDetails.content.amortizationSchedule,
        openModal: accountDetails.content.openModal,
        propertyAddress: accountDetails.content.propertyAddress,
        depositSectionHTML: depositWorkspace.depositSectionHTML,
        accountHistoryRepository:
          accountDetails.content.accountHistoryRepository,
        workflows: accountDetails.content.workflows,
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
