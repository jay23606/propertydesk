/* Wire account detail and security-deposit workspaces from scoped dependencies. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceSetup({
    records,
    ui,
    services,
    workflows,
  }) {
    return workflows.workspace.create({
      depositWorkspaceWorkflow: workflows.deposit.workspace,
      depositWorkflows: {
        detailsModel: workflows.deposit.detailsModel,
        detailsView: workflows.deposit.detailsView,
        adjustmentWorkflow: workflows.deposit.adjustmentWorkflow,
        adjustmentModules: workflows.deposit.adjustmentModules,
      },
      accountDetailWorkspaceWorkflow: workflows.accountDetails.workspace,
      accountDetailContentWorkflow: workflows.accountDetails.content,
      accountDetailActionWorkflow: workflows.accountDetails.action,
      accountDetailActionWorkflows: workflows.accountDetails.actionWorkflows,
      deposits: {
        details: {
          depositLedger: services.depositLedger,
          money: ui.money,
          fmtDate: ui.fmtDate,
          esc: ui.esc,
        },
        adjustments: {
          $: ui.$,
          getAccount: records.getAccount,
          getWorkspaceOwnerId: records.getWorkspaceOwnerId,
          getCollection: records.getDepositCollection,
          todayIso: ui.todayIso,
          toast: ui.toast,
          fetchAll: services.fetchAll,
          moneyInput: ui.moneyInput,
          repository: {
            insert: services.depositRepository.insert,
          },
          saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
          prepareAdjustment: workflows.adjustmentModel.prepare,
          validateAdjustment: workflows.adjustmentModel.validate,
          resolveAdjustmentType: workflows.adjustmentModel.resolveType,
          promptAction: ui.promptAction,
        },
      },
      accountDetails: {
        content: {
          $: ui.$,
          getAccount: records.getAccount,
          getProperty: records.getProperty,
          getPaymentsForAccount: records.getPaymentsForAccount,
          getAgreementVersions: records.getAgreementVersions,
          beginAuditRequest: records.beginAuditRequest,
          isCurrentAuditRequest: records.isCurrentAuditRequest,
          money: ui.money,
          fmtDate: ui.fmtDate,
          fmtDateTime: ui.fmtDateTime,
          esc: ui.esc,
          sumPosted: ui.sumPosted,
          prettyType: ui.prettyType,
          paymentFrequencyLabel: ui.paymentFrequencyLabel,
          summarizeAccount: ui.summarizeAccount,
          amortizationSchedule: ui.amortizationSchedule,
          openModal: ui.openModal,
          propertyAddress: ui.propertyAddress,
          accountHistoryRepository: services.accountHistoryRepository,
          workflows: workflows.accountDetails.contentModules,
        },
        actions: {
          $: ui.$,
          getAccount: records.getAccount,
          getCollection: records.getAccountCollection,
          toast: ui.toast,
          fetchAll: services.fetchAll,
          closeModal: ui.closeModal,
          editAccount: ui.editAccount,
          openPayment: ui.openPayment,
          repository: {
            close: services.accountRepository.close,
          },
          saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
          confirmAction: ui.confirmAction,
        },
      },
    });
  }

  window.PropertyDeskAccountDepositWorkspaceSetup = Object.freeze({
    create: createAccountDepositWorkspaceSetup,
  });
})();
