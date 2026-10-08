/* Save the workspace owner's display name in the authenticated account profile. */
(() => {
  "use strict";

  function createProfileSettings({ state, authClient, toast, updateGreeting }) {
    async function saveProfile(displayName) {
      if (!displayName) {
        toast("Enter a display name");
        return;
      }

      let data;
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: async () => {
          const result = await authClient.updateUser({
            data: { display_name: displayName },
          });
          data = result.data;
          return result;
        },
        toast,
        failureMessage:
          "Display name result couldn't be confirmed. Reload your profile before trying again.",
        onUnconfirmed: async () => {
          reconciled = await reconcileUnconfirmedProfile(displayName);
          return reconciled;
        },
      });
      if (!saved) return false;
      if (reconciled) return true;

      state.user = data?.user || state.user;
      updateGreeting();
      toast("Display name saved");
      return true;
    }

    async function reconcileUnconfirmedProfile(displayName) {
      let data;
      let error;
      try {
        ({ data, error } = await authClient.getUser());
      } catch {
        toast(
          "Display name result couldn't be confirmed. Reload your profile before trying again.",
        );
        return false;
      }
      if (error || !data?.user) {
        toast(
          "Display name result couldn't be confirmed. Reload your profile before trying again.",
        );
        return false;
      }

      state.user = data.user;
      updateGreeting();
      const saved = data.user.user_metadata?.display_name === displayName;
      toast(
        saved
          ? "Display name saved"
          : "Display name was not updated. Your current profile was refreshed; review it before retrying.",
      );
      return saved;
    }

    return Object.freeze({ saveProfile });
  }

  window.PropertyDeskProfileSettings = Object.freeze({
    create: createProfileSettings,
  });
})();
