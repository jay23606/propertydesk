/* Connect held-deposit services with account detail content and actions. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({ deposits, accountDetails }) {
    const depositWorkspace =
      window.PropertyDeskDepositWorkspaceWorkflow.create(deposits);
    const accountDetailWorkspace =
      window.PropertyDeskAccountDetailWorkspaceWorkflow.create({
        content: {
          $: accountDetails.content.$,
          state: accountDetails.content.state,
          money: accountDetails.content.money,
          fmtDate: accountDetails.content.fmtDate,
          esc: accountDetails.content.esc,
          sumPosted: accountDetails.content.sumPosted,
          prettyType: accountDetails.content.prettyType,
          paymentFrequencyLabel: accountDetails.content.paymentFrequencyLabel,
          summarizeAccount: accountDetails.content.summarizeAccount,
          amortizationSchedule: accountDetails.content.amortizationSchedule,
          openModal: accountDetails.content.openModal,
          propertyAddress: accountDetails.content.propertyAddress,
          accountHistoryRepository:
            accountDetails.content.accountHistoryRepository,
          depositSectionHTML: depositWorkspace.depositSectionHTML,
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
