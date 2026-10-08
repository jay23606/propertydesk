/* Password reset request, verification, and completion workflows. */
(() => {
  "use strict";

  function createAuthRecovery({
    $,
    state,
    authClient,
    toast,
    setAuthMode,
    startWorkspace,
    showAuth,
    windowRef = window,
    documentRef = document,
  }) {
    const view = window.PropertyDeskAuthRecoveryView.create({ $, documentRef });
    const { requestPasswordReset } = window.PropertyDeskAuthResetRequest.create(
      {
        authClient,
        view,
        windowRef,
      },
    );

    function showPasswordReset() {
      state.passwordRecoveryInProgress = true;
      view.showPasswordReset();
      showAuth();
    }

    async function submitPasswordReset(event) {
      event.preventDefault();
      const { password, confirmation } = view.passwordValues();
      if (password !== confirmation) {
        view.setMessage("Those passwords do not match.");
        return;
      }
      view.setSubmitBusy(true);
      let result;
      try {
        result = await authClient.updateUser({ password });
      } catch {
        view.setMessage("Unable to update your password right now. Try again.");
        return;
      } finally {
        view.setSubmitBusy(false);
      }
      const { data, error } = result;
      if (error) {
        view.setMessage(error.message);
        return;
      }
      state.user = data.user || state.user;
      state.passwordRecoveryInProgress = false;
      windowRef.history.replaceState(
        null,
        "",
        `${windowRef.location.pathname}${windowRef.location.search}`,
      );
      setAuthMode(false);
      await startWorkspace();
      toast("Password updated");
    }

    function isPasswordRecoverySession(session) {
      const params = new URLSearchParams(
        windowRef.location.hash.replace(/^#/, ""),
      );
      return (
        params.get("type") === "recovery" &&
        params.get("access_token") === session?.access_token
      );
    }

    function cancelPasswordReset() {
      state.passwordRecoveryInProgress = false;
      setAuthMode(false);
      showAuth();
    }

    function attachEvents() {
      view.attachEvents({
        requestPasswordReset,
        submitPasswordReset,
        cancelPasswordReset,
      });
    }

    return Object.freeze({
      showPasswordReset,
      isPasswordRecoverySession,
      attachEvents,
    });
  }

  window.PropertyDeskAuthRecovery = Object.freeze({
    create: createAuthRecovery,
  });
})();
