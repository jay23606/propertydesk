/* Collect authentication and lifecycle modules for application startup. */
(() => {
  "use strict";

  function createAppStartupModuleCatalog() {
    return Object.freeze({
      startup: window.PropertyDeskAppStartupWorkflow,
      auth: {
        create: window.PropertyDeskAuth.create,
        modules: {
          screens: window.PropertyDeskAuthScreens,
          form: window.PropertyDeskAuthForm,
          formView: window.PropertyDeskAuthFormView,
          recovery: window.PropertyDeskAuthRecovery,
          recoveryView: window.PropertyDeskAuthRecoveryView,
          resetRequest: window.PropertyDeskAuthResetRequest,
          session: window.PropertyDeskAuthSession,
        },
      },
      lifecycle: window.PropertyDeskAppLifecycle,
    });
  }

  window.PropertyDeskAppStartupModuleCatalog = Object.freeze({
    create: createAppStartupModuleCatalog,
  });
})();
