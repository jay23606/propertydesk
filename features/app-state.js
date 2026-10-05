/* Central default state for the PropertyDesk browser session. */
(() => {
  "use strict";

  function createAppState() {
    return {
      client: null,
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

  window.PropertyDeskAppState = Object.freeze({ create: createAppState });
})();
