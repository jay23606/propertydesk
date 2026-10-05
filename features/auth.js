/* Compose authentication screens, account entry, recovery, and sessions. */
(() => {
  "use strict";

  function create({ $, state, fetchAll, toast, windowRef = window, documentRef = document }) {
    function showAuth() {
      $("auth-view").classList.remove("hidden");
      $("app-view").classList.add("hidden");
    }

    const {
      setAuthMode,
      submitAuth,
      attachEvents: attachAuthFormEvents,
    } = window.PropertyDeskAuthForm.create({
      $, state, documentRef, startWorkspace,
    });

    const {
      showPasswordReset,
      isPasswordRecoverySession,
      attachEvents: attachRecoveryEvents,
    } = window.PropertyDeskAuthRecovery.create({
      $,
      state,
      toast,
      setAuthMode,
      startWorkspace,
      showAuth,
      windowRef,
      documentRef,
    });

    function showApp() {
      $("auth-view").classList.add("hidden");
      $("app-view").classList.remove("hidden");
    }

    function showConfigError() {
      $("config-banner").innerHTML = "Supabase is not configured. Copy <code>config.example.js</code> to <code>config.js</code>, add your project URL and anon key, then reload.";
      $("config-banner").classList.remove("hidden");
      $("auth-title").textContent = "Connect your workspace";
      documentRef.querySelector(".auth-intro").textContent = "Add your Supabase project settings to start your private PropertyDesk workspace.";
      $("auth-form").classList.add("hidden");
      $("password-reset-form").classList.add("hidden");
      $("forgot-password").classList.add("hidden");
      $("auth-toggle").classList.add("hidden");
      documentRef.querySelector(".privacy-note").classList.add("hidden");
      showAuth();
    }

    async function startWorkspace() {
      showApp();
      try {
        await fetchAll();
      } catch {
        // fetchAll already reports the failure.
      }
    }

    const {
      handleAuthStateChange,
      restoreAuthSession,
      signOut,
    } = window.PropertyDeskAuthSession.create({
      state,
      toast,
      showAuth,
      setAuthMode,
      showPasswordReset,
      isPasswordRecoverySession,
      startWorkspace,
    });

    function attachEvents() {
      $("sign-out").addEventListener("click", signOut);
      attachAuthFormEvents();
      attachRecoveryEvents();
    }

    return {
      showAuth,
      showApp,
      showConfigError,
      setAuthMode,
      submitAuth,
      startWorkspace,
      handleAuthStateChange,
      restoreAuthSession,
      signOut,
      attachEvents,
    };
  }

  window.PropertyDeskAuth = { create };
})();
