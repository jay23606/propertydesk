/* Restore authenticated sessions and react to Supabase auth-state changes. */
(() => {
  "use strict";

  function createAuthSession({
    state, toast, showAuth, setAuthMode, showPasswordReset,
    isPasswordRecoverySession, startWorkspace,
  }) {
    function handleAuthStateChange(event, session) {
      if (event === "SIGNED_OUT") {
        state.user = null;
        state.passwordRecoveryInProgress = false;
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

    return { handleAuthStateChange, restoreAuthSession };
  }

  window.PropertyDeskAuthSession = Object.freeze({ create: createAuthSession });
})();
