/* Send password reset requests and keep feedback generic. */
(() => {
  "use strict";

  function createAuthResetRequest({ authClient, view, windowRef }) {
    async function requestPasswordReset() {
      const email = view.requestEmail();
      if (!view.requestEmailIsValid()) return;
      view.setRequestDisabled(true);
      try {
        const redirectTo = `${windowRef.location.origin}${windowRef.location.pathname}`;
        const { error } = await authClient.resetPasswordForEmail(email, {
          redirectTo,
        });
        view.setMessage(
          error
            ? "Unable to request a reset right now. Try again later."
            : "If that email has a PropertyDesk account, a reset link is on its way.",
        );
      } catch {
        view.setMessage(
          "Unable to request a reset right now. Try again later.",
        );
      } finally {
        view.setRequestDisabled(false);
      }
    }

    return { requestPasswordReset };
  }

  window.PropertyDeskAuthResetRequest = Object.freeze({
    create: createAuthResetRequest,
  });
})();
