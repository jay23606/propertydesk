/* Restore authenticated sessions and react to Supabase auth-state changes. */
(() => {
  "use strict";

  function createAuthSession({
    state,
    authClient,
    toast,
    showAuth,
    setAuthMode,
    showPasswordReset,
    isPasswordRecoverySession,
    startWorkspace,
    resetWorkspaceState,
    stopWorkspaceNotifications = () => {},
  }) {
    function finishSignOut() {
      stopWorkspaceNotifications();
      resetWorkspaceState(state);
      showAuth();
      setAuthMode(false);
    }

    function handlePasswordRecovery(session) {
      if (!session?.user) return false;
      state.user = session.user;
      showPasswordReset();
      return true;
    }

    function handleAuthenticatedSession(event, session) {
      if (!session?.user) return;
      const previousUserId = state.user?.id;
      const signedIntoNewUser =
        event === "SIGNED_IN" && previousUserId !== session.user.id;
      const passwordRecoveryInProgress =
        state.passwordRecoveryInProgress === true;
      if (signedIntoNewUser) {
        stopWorkspaceNotifications();
        resetWorkspaceState(state);
        state.passwordRecoveryInProgress = passwordRecoveryInProgress;
      }
      state.user = session.user;
      if (signedIntoNewUser && !state.passwordRecoveryInProgress)
        startWorkspace();
    }

    function handleAuthStateChange(event, session) {
      if (event === "SIGNED_OUT") return finishSignOut();
      if (event === "PASSWORD_RECOVERY" && handlePasswordRecovery(session))
        return;
      handleAuthenticatedSession(event, session);
    }

    async function restoreAuthSession() {
      let session;
      try {
        const { data, error } = await authClient.getSession();
        if (error) throw error;
        session = data?.session;
      } catch {
        showAuth();
        toast(
          "Unable to restore your session right now. Check your connection and try again.",
        );
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
        const result = await authClient.signOut();
        const error = result?.error;
        if (error) {
          toast(error.message);
          return;
        }
      } catch {
        toast(
          "Unable to sign out right now. Check your connection and try again.",
        );
        return;
      }
      finishSignOut();
    }

    return Object.freeze({
      handleAuthStateChange,
      restoreAuthSession,
      signOut,
    });
  }

  window.PropertyDeskAuthSession = Object.freeze({ create: createAuthSession });
})();
