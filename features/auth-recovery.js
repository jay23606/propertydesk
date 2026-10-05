/* Password reset request, verification, and completion workflows. */
(() => {
  "use strict";

  function createAuthRecovery({
    $,
    state,
    toast,
    setAuthMode,
    startWorkspace,
    showAuth,
    windowRef = window,
    documentRef = document,
  }) {
    function showPasswordReset() {
      state.passwordRecoveryInProgress = true;
      $("auth-title").textContent = "Choose a new password";
      documentRef.querySelector(".auth-intro").textContent =
        "Your reset link is verified. Set a new password for your private workspace.";
      $("auth-form").classList.add("hidden");
      $("password-reset-form").classList.remove("hidden");
      $("forgot-password").classList.add("hidden");
      $("auth-toggle").classList.add("hidden");
      $("auth-message").textContent = "";
      showAuth();
    }

    async function requestPasswordReset() {
      const email = $("auth-email").value.trim();
      if (!$("auth-email").reportValidity()) return;
      $("forgot-password").disabled = true;
      try {
        const redirectTo = `${windowRef.location.origin}${windowRef.location.pathname}`;
        const { error } = await state.client.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        $("auth-message").textContent = error
          ? "Unable to request a reset right now. Try again later."
          : "If that email has a PropertyDesk account, a reset link is on its way.";
      } catch {
        $("auth-message").textContent =
          "Unable to request a reset right now. Try again later.";
      } finally {
        $("forgot-password").disabled = false;
      }
    }

    async function submitPasswordReset(event) {
      event.preventDefault();
      const password = $("reset-password").value;
      if (password !== $("reset-password-confirm").value) {
        $("auth-message").textContent = "Those passwords do not match.";
        return;
      }
      $("reset-password-submit").disabled = true;
      $("reset-password-submit").textContent = "Updating…";
      let result;
      try {
        result = await state.client.auth.updateUser({ password });
      } catch {
        $("auth-message").textContent =
          "Unable to update your password right now. Try again.";
        return;
      } finally {
        $("reset-password-submit").disabled = false;
        $("reset-password-submit").textContent = "Update password";
      }
      const { data, error } = result;
      if (error) {
        $("auth-message").textContent = error.message;
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

    function attachEvents() {
      $("forgot-password").addEventListener("click", requestPasswordReset);
      $("password-reset-form").addEventListener("submit", submitPasswordReset);
      $("reset-password-cancel").addEventListener("click", () => {
        state.passwordRecoveryInProgress = false;
        setAuthMode(false);
        showAuth();
      });
    }

    return {
      showPasswordReset,
      requestPasswordReset,
      submitPasswordReset,
      isPasswordRecoverySession,
      attachEvents,
    };
  }

  window.PropertyDeskAuthRecovery = Object.freeze({
    create: createAuthRecovery,
  });
})();
