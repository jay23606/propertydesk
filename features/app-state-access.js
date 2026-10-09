/* Expose live workspace state through feature-scoped accessors. */
(() => {
  "use strict";

  function createAppStateAccess(state) {
    const getProperties = () => state.properties;
    const getAccounts = () => state.accounts;
    const getPayments = () => state.payments;
    const getExpenses = () => state.expenses;
    const getImportBatches = () => state.importBatches;
    const getWorkspaceOwnerId = () => state.workspaceOwnerId;
    const getWorkspaceMembers = () => state.workspaceMembers;
    const getUser = () => state.user;

    function setUser(user) {
      state.user = user;
    }

    function beginAuditRequest() {
      return ++state.auditRequestId;
    }

    function getAccount(accountId) {
      return state.accounts.find((account) => account.id === accountId) || null;
    }

    function getProperty(propertyId) {
      return (
        state.properties.find((property) => property.id === propertyId) || null
      );
    }

    function getPaymentsForAccount(accountId) {
      return state.payments.filter(
        (payment) => payment.account_id === accountId,
      );
    }

    function getAgreementVersions(accountId) {
      return state.agreementVersions.filter(
        (version) => version.account_id === accountId,
      );
    }

    function getAccountCollection(collection) {
      return collection === "accounts" ? state.accounts : null;
    }

    function getDepositCollection(collection) {
      return collection === "depositEntries" ? state.depositEntries : null;
    }

    function group(values) {
      return Object.freeze(values);
    }

    return Object.freeze({
      report: group({
        getPayments,
        getExpenses,
        getAccounts,
        getImportBatches,
        getProperties,
      }),
      modal: group({
        setPendingImport: (value) => {
          state.pendingImport = value;
        },
        setPendingCorrection: (value) => {
          state.pendingCorrection = value;
        },
        advanceAuditRequestId: beginAuditRequest,
      }),
      formOptions: group({ getProperties, getAccounts }),
      reminderPreview: group({ getProperties, getPayments }),
      appShell: group({
        getAccounts,
        getProperties,
        getReminderLogs: () => state.reminderLogs,
        getUser,
        setUser,
        getWorkspaceMembers,
        getWorkspaceOwnerId,
        setView: (view) => {
          state.view = view;
        },
      }),
      propertyAccountForms: group({
        getProperties,
        getAccounts,
        getWorkspaceOwnerId,
      }),
      transactions: group({
        getProperties,
        getAccounts,
        getPayments,
        getExpenses,
        getWorkspaceOwnerId,
        getPendingCorrection: () => state.pendingCorrection,
        setPendingCorrection: (value) => {
          state.pendingCorrection = value;
        },
      }),
      createActions: group({ getProperties, getAccounts }),
      accountDeposit: group({
        getAccount,
        getProperty,
        getPaymentsForAccount,
        getAgreementVersions,
        beginAuditRequest,
        isCurrentAuditRequest: (requestId) =>
          requestId === state.auditRequestId,
        getWorkspaceOwnerId,
        getDepositCollection,
        getAccountCollection,
      }),
      properties: group({
        beginAuditRequest,
        setSelectedPropertyId: (propertyId) => {
          state.selectedPropertyId = propertyId;
        },
        getSelectedPropertyId: () => state.selectedPropertyId,
        getPayments,
        getExpenses,
        getProperties,
        getAccounts,
        getDocuments: () => state.documents,
        getWorkspaceMembers,
        getPropertyHolders: () => state.propertyHolders,
        getWorkspaceOwnerId,
        getSenderName: () =>
          state.user?.user_metadata?.display_name?.trim() || "PropertyDesk",
      }),
      imports: group({
        getWorkspaceOwnerId,
        getImportBatches,
        getAccounts,
        getPayments,
        getExpenses,
        getProperties,
        getPendingImport: () => state.pendingImport,
        setPendingImport: (value) => {
          state.pendingImport = value;
        },
      }),
      backup: group({ getUser, getWorkspaceOwnerId }),
      startup: group({
        getUser,
        setUser,
        getPasswordRecoveryInProgress: () => state.passwordRecoveryInProgress,
        setPasswordRecoveryInProgress: (value) => {
          state.passwordRecoveryInProgress = value;
        },
      }),
    });
  }

  window.PropertyDeskAppStateAccess = Object.freeze({
    create: createAppStateAccess,
  });
})();
