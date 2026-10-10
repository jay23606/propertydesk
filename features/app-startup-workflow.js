/* Compose authentication with application startup and lifecycle. */
(() => {
  "use strict";

  function createAppStartupWorkflow({
    $,
    backendConfigured,
    initializeClient,
    authClient,
    lifecycleAuthClient,
    todayIso,
    registerShell,
    authContext,
    renderers,
    eventBindersBeforeAuth,
    eventBindersAfterAuth,
    workflows,
  }) {
    const auth = workflows.auth.create({
      $: authContext.$,
      windowRef: authContext.windowRef,
      documentRef: authContext.documentRef,
      getUser: authContext.getUser,
      setUser: authContext.setUser,
      getPasswordRecoveryInProgress: authContext.getPasswordRecoveryInProgress,
      setPasswordRecoveryInProgress: authContext.setPasswordRecoveryInProgress,
      resetWorkspaceState: authContext.resetWorkspaceState,
      fetchAll: authContext.fetchAll,
      toast: authContext.toast,
      paymentNotifications: authContext.paymentNotifications,
      authClient,
      modules: workflows.auth.modules,
    });
    const lifecycle = workflows.lifecycle.create({
      $,
      backendConfigured,
      initializeClient,
      authClient: lifecycleAuthClient,
      todayIso,
      registerShell,
      auth: {
        setAuthMode: auth.setAuthMode,
        showConfigError: auth.showConfigError,
        handleAuthStateChange: auth.handleAuthStateChange,
        restoreAuthSession: auth.restoreAuthSession,
      },
      renderers,
      eventBinders: [
        ...eventBindersBeforeAuth,
        auth.attachEvents,
        ...eventBindersAfterAuth,
      ],
    });

    return lifecycle;
  }

  window.PropertyDeskAppStartupWorkflow = Object.freeze({
    create: createAppStartupWorkflow,
  });
})();
