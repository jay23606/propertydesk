/* Expose live workspace state through stable, purpose-specific accessors. */
(() => {
  "use strict";

  function createAppStateAccess(state) {
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

    function beginAuditRequest() {
      return ++state.auditRequestId;
    }

    function isCurrentAuditRequest(requestId) {
      return requestId === state.auditRequestId;
    }

    return Object.freeze({
      getProperties: () => state.properties,
      getAccounts: () => state.accounts,
      getPayments: () => state.payments,
      getExpenses: () => state.expenses,
      getImportBatches: () => state.importBatches,
      getReminderLogs: () => state.reminderLogs,
      getUser: () => state.user,
      setUser: (user) => {
        state.user = user;
      },
      getWorkspaceMembers: () => state.workspaceMembers,
      getWorkspaceOwnerId: () => state.workspaceOwnerId,
      getView: () => state.view,
      setView: (view) => {
        state.view = view;
      },
      getPendingImport: () => state.pendingImport,
      setPendingImport: (value) => {
        state.pendingImport = value;
      },
      getPendingCorrection: () => state.pendingCorrection,
      setPendingCorrection: (value) => {
        state.pendingCorrection = value;
      },
      getAccountCollection,
      getDepositCollection,
      getAccount,
      getProperty,
      getPaymentsForAccount,
      getAgreementVersions,
      beginAuditRequest,
      isCurrentAuditRequest,
      getSelectedPropertyId: () => state.selectedPropertyId,
      setSelectedPropertyId: (propertyId) => {
        state.selectedPropertyId = propertyId;
      },
      getPropertyHolders: () => state.propertyHolders,
      getDocuments: () => state.documents,
      getSenderName: () =>
        state.user?.user_metadata?.display_name?.trim() || "PropertyDesk",
      getPasswordRecoveryInProgress: () => state.passwordRecoveryInProgress,
      setPasswordRecoveryInProgress: (value) => {
        state.passwordRecoveryInProgress = value;
      },
    });
  }

  window.PropertyDeskAppStateAccess = Object.freeze({
    create: createAppStateAccess,
  });
})();
