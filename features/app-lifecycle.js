/* Shared page rendering, event binding, and startup coordination. */
(() => {
  "use strict";

  function create({
    $,
    backend,
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
      attachEvents();
      $("payment-date").value = todayIso();
      $("account-start").value = todayIso();
      auth.setAuthMode(false);
      registerShell();

      if (!backend.configured) {
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
