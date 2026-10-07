/* Compose authentication screens, account entry, recovery, and sessions. */
(() => {
  "use strict";

  function create({
    $,
    state,
    authClient,
    fetchAll,
    toast,
    windowRef = window,
    documentRef = document,
  }) {
    const { showAuth, showApp, showConfigError } =
      window.PropertyDeskAuthScreens.create({ $, documentRef });

    const { setAuthMode, attachEvents: attachAuthFormEvents } =
      window.PropertyDeskAuthForm.create({
        $,
        state,
        authClient,
        documentRef,
        startWorkspace,
      });

    const {
      showPasswordReset,
      isPasswordRecoverySession,
      attachEvents: attachRecoveryEvents,
    } = window.PropertyDeskAuthRecovery.create({
      $,
      state,
      authClient,
      toast,
      setAuthMode,
      startWorkspace,
      showAuth,
      windowRef,
      documentRef,
    });

    async function startWorkspace() {
      showApp();
      try {
        await fetchAll();
      } catch {
        // fetchAll already reports the failure.
      }
    }

    const { handleAuthStateChange, restoreAuthSession, signOut } =
      window.PropertyDeskAuthSession.create({
        state,
        authClient,
        toast,
        showAuth,
        setAuthMode,
        showPasswordReset,
        isPasswordRecoverySession,
        startWorkspace,
        resetWorkspaceState: window.PropertyDeskAppState.resetWorkspaceState,
      });

    function attachEvents() {
      $("sign-out").addEventListener("click", signOut);
      attachAuthFormEvents();
      attachRecoveryEvents();
    }

    return {
      showConfigError,
      setAuthMode,
      handleAuthStateChange,
      restoreAuthSession,
      attachEvents,
    };
  }

  window.PropertyDeskAuth = Object.freeze({ create });
})();
