/* Compose authentication screens, account entry, recovery, and sessions. */
(() => {
  "use strict";

  function create({
    $,
    state,
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

  window.PropertyDeskAuth = { create };
})();
