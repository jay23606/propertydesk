/* Connect held-deposit services with account detail content and actions. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({
    deposits,
    accountDetails,
    depositWorkspaceWorkflow,
    accountDetailWorkspaceWorkflow,
    accountDetailActionWorkflow,
    accountDetailActionWorkflows,
  }) {
    const depositWorkspace = depositWorkspaceWorkflow.create({
      details: {
        state: deposits.details.state,
        depositLedger: deposits.details.depositLedger,
        money: deposits.details.money,
        fmtDate: deposits.details.fmtDate,
        esc: deposits.details.esc,
      },
      adjustments: {
        $: deposits.adjustments.$,
        state: deposits.adjustments.state,
        todayIso: deposits.adjustments.todayIso,
        toast: deposits.adjustments.toast,
        fetchAll: deposits.adjustments.fetchAll,
        moneyInput: deposits.adjustments.moneyInput,
        repository: deposits.adjustments.repository,
        prepareAdjustment: deposits.adjustments.prepareAdjustment,
        validateAdjustment: deposits.adjustments.validateAdjustment,
        resolveAdjustmentType: deposits.adjustments.resolveAdjustmentType,
      },
    });
    const accountDetailWorkspace = accountDetailWorkspaceWorkflow.create({
      actionWorkflow: accountDetailActionWorkflow,
      actionWorkflows: accountDetailActionWorkflows,
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
        workflows: accountDetails.content.workflows,
        depositSectionHTML: depositWorkspace.depositSectionHTML,
      },
      actions: {
        $: accountDetails.actions.$,
        state: accountDetails.actions.state,
        toast: accountDetails.actions.toast,
        fetchAll: accountDetails.actions.fetchAll,
        closeModal: accountDetails.actions.closeModal,
        editAccount: accountDetails.actions.editAccount,
        openPayment: accountDetails.actions.openPayment,
        repository: accountDetails.actions.repository,
      },
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
