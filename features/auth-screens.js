/* Authentication and workspace screen presentation. */
(() => {
  "use strict";

  function createAuthScreens({ $, documentRef = document }) {
    function showAuth() {
      $("auth-view").classList.remove("hidden");
      $("app-view").classList.add("hidden");
    }

    function showApp() {
      $("auth-view").classList.add("hidden");
      $("app-view").classList.remove("hidden");
    }

    function showConfigError() {
      $("config-banner").innerHTML =
        "Supabase is not configured. Copy <code>config.example.js</code> to <code>config.js</code>, add your project URL and anon key, then reload.";
      $("config-banner").classList.remove("hidden");
      $("auth-title").textContent = "Connect your workspace";
      documentRef.querySelector(".auth-intro").textContent =
        "Add your Supabase project settings to start your private PropertyDesk workspace.";
      $("auth-form").classList.add("hidden");
      $("password-reset-form").classList.add("hidden");
      $("forgot-password").classList.add("hidden");
      $("auth-toggle").classList.add("hidden");
      documentRef.querySelector(".privacy-note").classList.add("hidden");
      showAuth();
    }

    return Object.freeze({ showAuth, showApp, showConfigError });
  }

  window.PropertyDeskAuthScreens = Object.freeze({ create: createAuthScreens });
})();
