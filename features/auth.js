/* PropertyDesk sign-in, account recovery, and workspace entry workflows. */
(() => {
  "use strict";

  function create({ $, state, fetchAll, toast, windowRef = window, documentRef = document }) {
    function showAuth() {
      $("auth-view").classList.remove("hidden");
      $("app-view").classList.add("hidden");
    }

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

    function setAuthMode(signup) {
      $("auth-form").classList.remove("hidden");
      $("password-reset-form").classList.add("hidden");
      $("forgot-password").classList.toggle("hidden", signup);
      $("auth-toggle").classList.remove("hidden");
      $("auth-form").dataset.mode = signup ? "signup" : "signin";
      $("auth-title").textContent = signup ? "Create your account" : "Welcome back";
      documentRef.querySelector(".auth-intro").textContent = signup
        ? "Set up your private PropertyDesk workspace."
        : "Sign in to manage your properties and accounts.";
      $("auth-submit").textContent = signup ? "Create account" : "Sign in";
      $("auth-password").autocomplete = signup ? "new-password" : "current-password";
      $("auth-toggle").textContent = signup ? "Already have an account? Sign in" : "Create an account";
      $("auth-message").textContent = "";
    }

    function showPasswordReset() {
      state.passwordRecoveryInProgress = true;
      $("auth-title").textContent = "Choose a new password";
      documentRef.querySelector(".auth-intro").textContent = "Your reset link is verified. Set a new password for your private workspace.";
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
        const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });
        $("auth-message").textContent = error
          ? "Unable to request a reset right now. Try again later."
          : "If that email has a PropertyDesk account, a reset link is on its way.";
      } catch {
        $("auth-message").textContent = "Unable to request a reset right now. Try again later.";
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
      const { data, error } = await state.client.auth.updateUser({ password });
      $("reset-password-submit").disabled = false;
      $("reset-password-submit").textContent = "Update password";
      if (error) {
        $("auth-message").textContent = error.message;
        return;
      }
      state.user = data.user || state.user;
      state.passwordRecoveryInProgress = false;
      windowRef.history.replaceState(null, "", `${windowRef.location.pathname}${windowRef.location.search}`);
      setAuthMode(false);
      await startWorkspace();
      toast("Password updated");
    }

    async function submitAuth(event) {
      event.preventDefault();
      const email = $("auth-email").value.trim();
      const password = $("auth-password").value;
      const signup = $("auth-form").dataset.mode === "signup";
      $("auth-submit").disabled = true;
      $("auth-submit").textContent = "Please wait…";
      let result;
      if (signup) result = await state.client.auth.signUp({ email, password });
      else result = await state.client.auth.signInWithPassword({ email, password });
      $("auth-submit").disabled = false;
      $("auth-submit").textContent = signup ? "Create account" : "Sign in";
      if (result.error) {
        $("auth-message").textContent = result.error.message;
        return;
      }
      if (signup && !result.data.session) {
        $("auth-message").textContent = "Check your email to confirm your account, then come back to sign in.";
        return;
      }
      $("auth-message").textContent = "";
      if (result.data.user) {
        state.user = result.data.user;
        await startWorkspace();
      }
    }

    async function startWorkspace() {
      showApp();
      try {
        await fetchAll();
      } catch {
        // fetchAll already reports the failure.
      }
    }

    async function signOut() {
      await state.client.auth.signOut();
      state.user = null;
      state.passwordRecoveryInProgress = false;
      state.properties = [];
      state.accounts = [];
      state.payments = [];
      showAuth();
      setAuthMode(false);
    }

    function attachEvents() {
      $('sign-out').addEventListener('click', signOut);
      $('auth-toggle').addEventListener('click', () =>
        setAuthMode($('auth-form').dataset.mode !== 'signup'),
      );
      $('auth-form').addEventListener('submit', submitAuth);
      $('forgot-password').addEventListener('click', requestPasswordReset);
      $('password-reset-form').addEventListener('submit', submitPasswordReset);
      $('reset-password-cancel').addEventListener('click', () => {
        state.passwordRecoveryInProgress = false;
        setAuthMode(false);
        showAuth();
      });
    }

    function handleAuthStateChange(event, session) {
      if (event === 'SIGNED_OUT') {
        state.user = null;
        state.passwordRecoveryInProgress = false;
        showAuth();
        setAuthMode(false);
        return;
      }
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        state.user = session.user;
        showPasswordReset();
        return;
      }
      if (!session?.user) return;

      const previousUserId = state.user?.id;
      state.user = session.user;
      const signedIntoNewUser =
        event === 'SIGNED_IN' && previousUserId !== session.user.id;
      if (signedIntoNewUser && !state.passwordRecoveryInProgress)
        startWorkspace();
    }

    function isPasswordRecoverySession(session) {
      const params = new URLSearchParams(
        windowRef.location.hash.replace(/^#/, ''),
      );
      return (
        params.get('type') === 'recovery' &&
        params.get('access_token') === session?.access_token
      );
    }

    async function restoreAuthSession() {
      const {
        data: { session },
      } = await state.client.auth.getSession();
      if (!session?.user) {
        showAuth();
        return;
      }

      state.user = session.user;
      if (isPasswordRecoverySession(session)) showPasswordReset();
      else if (!state.passwordRecoveryInProgress) await startWorkspace();
    }

    return {
      showAuth,
      showApp,
      showConfigError,
      setAuthMode,
      showPasswordReset,
      requestPasswordReset,
      submitPasswordReset,
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
