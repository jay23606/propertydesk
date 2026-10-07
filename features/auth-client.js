/* Resolve Supabase auth operations through the current workspace client. */
(() => {
  "use strict";

  function create({ getClient }) {
    function auth() {
      const client = getClient();
      if (!client?.auth) throw new Error("Authentication is not ready yet.");
      return client.auth;
    }

    return Object.freeze({
      onAuthStateChange: (...args) => auth().onAuthStateChange(...args),
      signUp: (...args) => auth().signUp(...args),
      signInWithPassword: (...args) => auth().signInWithPassword(...args),
      getSession: (...args) => auth().getSession(...args),
      signOut: (...args) => auth().signOut(...args),
      resetPasswordForEmail: (...args) => auth().resetPasswordForEmail(...args),
      updateUser: (...args) => auth().updateUser(...args),
    });
  }

  window.PropertyDeskAuthClient = Object.freeze({ create });
})();
