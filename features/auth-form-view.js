/* Sign-in form state, field reads, and event bindings. */
(() => {
  "use strict";

  function create({ $, documentRef = document }) {
    function setAuthMode(signup) {
      $("auth-form").classList.remove("hidden");
      $("password-reset-form").classList.add("hidden");
      $("forgot-password").classList.toggle("hidden", signup);
      $("auth-toggle").classList.remove("hidden");
      $("auth-form").dataset.mode = signup ? "signup" : "signin";
      $("auth-title").textContent = signup
        ? "Create your account"
        : "Welcome back";
      documentRef.querySelector(".auth-intro").textContent = signup
        ? "Set up your private PropertyDesk workspace."
        : "Sign in to manage your properties and accounts.";
      $("auth-submit").textContent = signup ? "Create account" : "Sign in";
      $("auth-password").autocomplete = signup
        ? "new-password"
        : "current-password";
      $("auth-toggle").textContent = signup
        ? "Already have an account? Sign in"
        : "Create an account";
      setMessage("");
    }

    function credentials() {
      return {
        email: $("auth-email").value.trim(),
        password: $("auth-password").value,
        signup: $("auth-form").dataset.mode === "signup",
      };
    }

    function setSubmitting(submitting, signup) {
      $("auth-submit").disabled = submitting;
      $("auth-submit").textContent = submitting
        ? "Please wait…"
        : signup
          ? "Create account"
          : "Sign in";
    }

    function setMessage(message) {
      $("auth-message").textContent = message;
    }

    function attachEvents({ toggleAuthMode, submitAuth }) {
      $("auth-toggle").addEventListener("click", toggleAuthMode);
      $("auth-form").addEventListener("submit", submitAuth);
    }

    return {
      attachEvents,
      credentials,
      setAuthMode,
      setMessage,
      setSubmitting,
    };
  }

  window.PropertyDeskAuthFormView = Object.freeze({ create });
})();
