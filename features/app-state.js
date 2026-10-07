/* Central default state for the PropertyDesk browser session. */
(() => {
  "use strict";

  function createAppState() {
    return {
      user: null,
      workspaceOwnerId: null,
      workspaceMembers: [],
      propertyHolders: [],
      depositEntries: [],
      reminderLogs: [],
      view: "properties",
      properties: [],
      accounts: [],
      payments: [],
      expenses: [],
      documents: [],
      agreementVersions: [],
      importBatches: [],
      pendingImport: null,
      pendingCorrection: null,
      editingProperty: null,
      editingAccount: null,
      selectedPropertyId: null,
      auditRequestId: 0,
      passwordRecoveryInProgress: false,
    };
  }

  function resetWorkspaceState(state) {
    const defaults = createAppState();
    const view = state.view;
    const auditRequestId = Number.isFinite(state.auditRequestId)
      ? state.auditRequestId + 1
      : 1;
    Object.assign(state, defaults, { view, auditRequestId });
  }

  window.PropertyDeskAppState = Object.freeze({
    create: createAppState,
    resetWorkspaceState,
  });
})();
