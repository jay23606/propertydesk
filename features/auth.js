/* Compose authentication screens, account entry, recovery, and sessions. */
(() => {
  "use strict";

  function create({
    $,
    getUser,
    setUser,
    getPasswordRecoveryInProgress,
    setPasswordRecoveryInProgress,
    resetWorkspaceState,
    authClient,
    fetchAll,
    toast,
    paymentNotifications = { start() {}, stop() {} },
    windowRef = window,
    documentRef = document,
    modules,
  }) {
    const { showAuth, showApp, showConfigError } = modules.screens.create({
      $,
      documentRef,
    });

    const { setAuthMode, attachEvents: attachAuthFormEvents } =
      modules.form.create({
        $,
        setUser,
        authClient,
        documentRef,
        startWorkspace,
        viewModule: modules.formView,
      });

    const {
      showPasswordReset,
      isPasswordRecoverySession,
      attachEvents: attachRecoveryEvents,
    } = modules.recovery.create({
      $,
      getUser,
      setUser,
      getPasswordRecoveryInProgress,
      setPasswordRecoveryInProgress,
      authClient,
      toast,
      setAuthMode,
      startWorkspace,
      showAuth,
      windowRef,
      documentRef,
      viewModule: modules.recoveryView,
      resetRequestModule: modules.resetRequest,
    });

    async function startWorkspace() {
      showApp();
      try {
        await fetchAll();
        paymentNotifications.start();
      } catch {
        // fetchAll already reports the failure.
      }
    }

    const { handleAuthStateChange, restoreAuthSession, signOut } =
      modules.session.create({
        getUser,
        setUser,
        getPasswordRecoveryInProgress,
        setPasswordRecoveryInProgress,
        authClient,
        toast,
        showAuth,
        setAuthMode,
        showPasswordReset,
        isPasswordRecoverySession,
        startWorkspace,
        resetWorkspaceState,
        stopWorkspaceNotifications: paymentNotifications.stop,
      });

    function attachEvents() {
      $("sign-out").addEventListener("click", signOut);
      attachAuthFormEvents();
      attachRecoveryEvents();
    }

    return Object.freeze({
      showConfigError,
      setAuthMode,
      handleAuthStateChange,
      restoreAuthSession,
      attachEvents,
    });
  }

  window.PropertyDeskAuth = Object.freeze({ create });
})();
