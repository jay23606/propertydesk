/* Describe the feature modules used to create shared app services. */
(() => {
  "use strict";

  function createAppServiceModuleCatalog() {
    return Object.freeze({
      writeFeedback: {
        factory: window.PropertyDeskRepositoryWriteFeedback,
        reconciliation: window.PropertyDeskWorkspaceWriteReconciliation,
        recordWrites: window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
      emailUtils: {
        factory: window.PropertyDeskEmailUtils,
        emailAddressUtils: window.PropertyDeskEmailAddressUtils,
        reminderCopy: window.PropertyDeskReminderCopy,
      },
      postedLedger: {
        factory: window.PropertyDeskPostedLedgerUtils,
        currencyUtils: window.PropertyDeskCurrencyUtils,
      },
      notifications: window.PropertyDeskNotifications,
      workspaceRuntime: {
        factory: window.PropertyDeskWorkspaceRuntime,
        repositories: {
          queryUtils: window.PropertyDeskRepositoryQueryUtils,
          accounts: window.PropertyDeskAccountRepository,
          accountHistory: window.PropertyDeskAccountHistoryRepository,
          deposits: window.PropertyDeskDepositRepository,
          documents: window.PropertyDeskDocumentRepository,
          imports: window.PropertyDeskImportRepository,
          properties: window.PropertyDeskPropertyRepository,
          propertyHolders: window.PropertyDeskPropertyHolderRepository,
          transactions: window.PropertyDeskTransactionRepository,
          workspaceMembers: window.PropertyDeskWorkspaceMemberRepository,
        },
        tables: window.PropertyDeskWorkspaceTables,
        workflows: {
          backendClient: window.PropertyDeskBackendClient,
          appState: window.PropertyDeskAppState,
          authClient: window.PropertyDeskAuthClient,
          repositoryRegistry: window.PropertyDeskRepositoryRegistry,
          query: window.PropertyDeskWorkspaceQuery,
          readCatalog: window.PropertyDeskWorkspaceReadCatalog,
          data: window.PropertyDeskWorkspaceData,
          refresh: window.PropertyDeskWorkspaceRefresh,
        },
      },
      paymentNotificationSetup: window.PropertyDeskPaymentNotificationSetup,
      paymentNotifications: window.PropertyDeskPaymentNotifications,
      displayUtils: window.PropertyDeskDisplayUtils,
      propertyAddressUtils: window.PropertyDeskPropertyAddressUtils,
      dateUtils: window.PropertyDeskDateUtils,
      currencyUtils: window.PropertyDeskCurrencyUtils,
      accountStatusUtils: window.PropertyDeskAccountStatusUtils,
      financialContext: {
        factory: window.PropertyDeskWorkspaceFinancialContext,
        workflows: {
          schedule: window.PropertyDeskScheduleUtils,
          loanSchedule: window.PropertyDeskLoanAmortizationUtils,
          accountFinancialContext:
            window.PropertyDeskWorkspaceAccountFinancialContext,
          ledgerContext: window.PropertyDeskLedgerContext,
          accountSummary: window.PropertyDeskAccountFinancialSummary,
        },
      },
      depositContext: {
        factory: window.PropertyDeskWorkspaceDepositContext,
        workflows: {
          depositLedger: window.PropertyDeskDepositLedgerUtils,
          depositContext: window.PropertyDeskDepositContext,
        },
      },
      stateAccess: window.PropertyDeskAppStateAccess,
    });
  }

  window.PropertyDeskAppServiceModuleCatalog = Object.freeze({
    create: createAppServiceModuleCatalog,
  });
})();
