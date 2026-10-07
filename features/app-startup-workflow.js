/* Compose authentication with application startup and lifecycle. */
(() => {
  "use strict";

  function createAppStartupWorkflow(context) {
    const {
      $,
      state,
      backend,
      todayIso,
      registerShell,
      authContext,
      renderers,
      eventBindersBeforeAuth,
      eventBindersAfterAuth,
    } = context;
    const auth = window.PropertyDeskAuth.create(authContext);
    const lifecycle = window.PropertyDeskAppLifecycle.create({
      $,
      state,
      backend,
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
