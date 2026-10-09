/* Connect workspace state and event bindings to the app startup workflow. */
(() => {
  "use strict";

  function createAppStartupSetup({ records, ui, services, workflows }) {
    return workflows.startup.create({
      $: ui.$,
      backendConfigured: services.backendConfigured,
      initializeClient: services.initializeClient,
      todayIso: ui.todayIso,
      registerShell: services.registerShell,
      authClient: services.authClient,
      authContext: {
        $: ui.$,
        getUser: records.getUser,
        setUser: records.setUser,
        getPasswordRecoveryInProgress: records.getPasswordRecoveryInProgress,
        setPasswordRecoveryInProgress: records.setPasswordRecoveryInProgress,
        resetWorkspaceState: records.resetWorkspaceState,
        fetchAll: services.fetchAll,
        toast: ui.toast,
        paymentNotifications: services.paymentNotifications,
      },
      renderers: ui.renderers,
      eventBindersBeforeAuth: ui.eventBindersBeforeAuth,
      eventBindersAfterAuth: ui.eventBindersAfterAuth,
      workflows: {
        auth: workflows.auth,
        lifecycle: workflows.lifecycle,
      },
    });
  }

  window.PropertyDeskAppStartupSetup = Object.freeze({
    create: createAppStartupSetup,
  });
})();
