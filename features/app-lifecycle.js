/* Shared page rendering, event binding, and startup coordination. */
(() => {
  "use strict";

  function create({
    $,
    backendConfigured,
    initializeClient,
    authClient,
    todayIso,
    registerShell,
    auth,
    renderers,
    eventBinders,
  }) {
    function render() {
      renderers.forEach((renderView) => renderView());
    }

    function attachEvents() {
      eventBinders.forEach((attach) => attach());
    }

    async function initialize() {
      const today = todayIso();
      attachEvents();
      $("payment-date").value = today;
      $("account-start").value = today;
      auth.setAuthMode(false);
      registerShell();

      if (!backendConfigured) {
        auth.showConfigError();
        return;
      }

      initializeClient();
      authClient.onAuthStateChange(auth.handleAuthStateChange);
      await auth.restoreAuthSession();
    }

    return { render, initialize };
  }

  window.PropertyDeskAppLifecycle = Object.freeze({ create });
})();
