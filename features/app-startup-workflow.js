/* Compose authentication with application startup and lifecycle. */
(() => {
  "use strict";

  function createAppStartupWorkflow({
    $,
    backendConfigured,
    initializeClient,
    authClient,
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
      state: authContext.state,
      authClient,
      fetchAll: authContext.fetchAll,
      toast: authContext.toast,
    });
    const lifecycle = workflows.lifecycle.create({
      $,
      backendConfigured,
      initializeClient,
      authClient,
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
