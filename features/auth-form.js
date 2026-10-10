/* Sign-in, account creation, and authentication submission workflow. */
(() => {
  "use strict";

  function createAuthForm({
    $,
    setUser,
    authClient,
    startWorkspace,
    viewModule,
    documentRef,
  }) {
    const view = viewModule.create({ $, documentRef });

    async function submitAuth(event) {
      event.preventDefault();
      const { email, password, signup } = view.credentials();
      view.setSubmitting(true, signup);
      let result;
      try {
        if (signup) result = await authClient.signUp({ email, password });
        else
          result = await authClient.signInWithPassword({
            email,
            password,
          });
      } catch {
        view.setMessage("Unable to connect right now. Please try again.");
        return;
      } finally {
        view.setSubmitting(false, signup);
      }
      if (result.error) {
        view.setMessage(result.error.message);
        return;
      }
      if (signup && !result.data.session) {
        view.setMessage(
          "Check your email to confirm your account, then come back to sign in.",
        );
        return;
      }
      view.setMessage("");
      if (result.data.user) {
        setUser(result.data.user);
        await startWorkspace();
      }
    }

    function toggleAuthMode() {
      view.setAuthMode(!view.credentials().signup);
    }

    function attachEvents() {
      view.attachEvents({ toggleAuthMode, submitAuth });
    }

    return Object.freeze({
      setAuthMode: view.setAuthMode,
      attachEvents,
    });
  }

  window.PropertyDeskAuthForm = Object.freeze({ create: createAuthForm });
})();
