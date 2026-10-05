/* Restore authenticated sessions and react to Supabase auth-state changes. */
(() => {
  "use strict";

  function createAuthSession({
    state, toast, showAuth, setAuthMode, showPasswordReset,
    isPasswordRecoverySession, startWorkspace,
  }) {
    function clearWorkspaceState() {
      state.user = null;
      state.workspaceOwnerId = null;
      state.workspaceMembers = [];
      state.propertyHolders = [];
      state.depositEntries = [];
      state.reminderLogs = [];
      state.properties = [];
      state.accounts = [];
      state.payments = [];
      state.expenses = [];
      state.documents = [];
      state.agreementVersions = [];
      state.importBatches = [];
      state.pendingImport = null;
      state.pendingCorrection = null;
      state.editingProperty = null;
      state.editingAccount = null;
      state.selectedPropertyId = null;
      state.auditRequestId++;
      state.passwordRecoveryInProgress = false;
    }

    function handleAuthStateChange(event, session) {
      if (event === "SIGNED_OUT") {
        clearWorkspaceState();
        showAuth();
        setAuthMode(false);
        return;
      }
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        state.user = session.user;
        showPasswordReset();
        return;
      }
      if (!session?.user) return;

      const previousUserId = state.user?.id;
      state.user = session.user;
      const signedIntoNewUser =
        event === "SIGNED_IN" && previousUserId !== session.user.id;
      if (signedIntoNewUser && !state.passwordRecoveryInProgress)
        startWorkspace();
    }

    async function restoreAuthSession() {
      let session;
      try {
        const { data, error } = await state.client.auth.getSession();
        if (error) throw error;
        session = data?.session;
      } catch {
        showAuth();
        toast("Unable to restore your session right now. Check your connection and try again.");
        return;
      }
      if (!session?.user) {
        showAuth();
        return;
      }

      state.user = session.user;
      if (isPasswordRecoverySession(session)) showPasswordReset();
      else if (!state.passwordRecoveryInProgress) await startWorkspace();
    }

    async function signOut() {
      try {
        const result = await state.client.auth.signOut();
        const error = result?.error;
        if (error) {
          toast(error.message);
          return;
        }
      } catch {
        toast("Unable to sign out right now. Check your connection and try again.");
        return;
      }
      clearWorkspaceState();
      showAuth();
      setAuthMode(false);
    }

    return { handleAuthStateChange, restoreAuthSession, signOut };
  }

  window.PropertyDeskAuthSession = Object.freeze({ create: createAuthSession });
})();
