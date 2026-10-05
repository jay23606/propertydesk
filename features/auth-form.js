/* Sign-in and account-creation form state and submission. */
(() => {
  "use strict";

  function createAuthForm({
    $,
    state,
    startWorkspace,
    documentRef = document,
  }) {
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
      $("auth-message").textContent = "";
    }

    async function submitAuth(event) {
      event.preventDefault();
      const email = $("auth-email").value.trim();
      const password = $("auth-password").value;
      const signup = $("auth-form").dataset.mode === "signup";
      $("auth-submit").disabled = true;
      $("auth-submit").textContent = "Please wait…";
      let result;
      try {
        if (signup)
          result = await state.client.auth.signUp({ email, password });
        else
          result = await state.client.auth.signInWithPassword({
            email,
            password,
          });
      } catch {
        $("auth-message").textContent =
          "Unable to connect right now. Please try again.";
        return;
      } finally {
        $("auth-submit").disabled = false;
        $("auth-submit").textContent = signup ? "Create account" : "Sign in";
      }
      if (result.error) {
        $("auth-message").textContent = result.error.message;
        return;
      }
      if (signup && !result.data.session) {
        $("auth-message").textContent =
          "Check your email to confirm your account, then come back to sign in.";
        return;
      }
      $("auth-message").textContent = "";
      if (result.data.user) {
        state.user = result.data.user;
        await startWorkspace();
      }
    }

    function attachEvents() {
      $("auth-toggle").addEventListener("click", () =>
        setAuthMode($("auth-form").dataset.mode !== "signup"),
      );
      $("auth-form").addEventListener("submit", submitAuth);
    }

    return { setAuthMode, submitAuth, attachEvents };
  }

  window.PropertyDeskAuthForm = Object.freeze({ create: createAuthForm });
})();
