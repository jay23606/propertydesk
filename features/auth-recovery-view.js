/* Password recovery form state and presentation. */
(() => {
  "use strict";

  function create({ $, documentRef = document }) {
    function showPasswordReset() {
      $("auth-title").textContent = "Choose a new password";
      documentRef.querySelector(".auth-intro").textContent =
        "Your reset link is verified. Set a new password for your private workspace.";
      $("auth-form").classList.add("hidden");
      $("password-reset-form").classList.remove("hidden");
      $("forgot-password").classList.add("hidden");
      $("auth-toggle").classList.add("hidden");
      $("auth-message").textContent = "";
    }

    function requestEmail() {
      return $("auth-email").value.trim();
    }

    function requestEmailIsValid() {
      return $("auth-email").reportValidity();
    }

    function setRequestDisabled(disabled) {
      $("forgot-password").disabled = disabled;
    }

    function passwordValues() {
      return {
        password: $("reset-password").value,
        confirmation: $("reset-password-confirm").value,
      };
    }

    function setMessage(message) {
      $("auth-message").textContent = message;
    }

    function setSubmitBusy(busy) {
      $("reset-password-submit").disabled = busy;
      $("reset-password-submit").textContent = busy
        ? "Updating…"
        : "Update password";
    }

    function attachEvents({
      requestPasswordReset,
      submitPasswordReset,
      cancelPasswordReset,
    }) {
      $("forgot-password").addEventListener("click", requestPasswordReset);
      $("password-reset-form").addEventListener("submit", submitPasswordReset);
      $("reset-password-cancel").addEventListener("click", cancelPasswordReset);
    }

    return Object.freeze({
      attachEvents,
      passwordValues,
      requestEmail,
      requestEmailIsValid,
      setMessage,
      setRequestDisabled,
      setSubmitBusy,
      showPasswordReset,
    });
  }

  window.PropertyDeskAuthRecoveryView = Object.freeze({ create });
})();
