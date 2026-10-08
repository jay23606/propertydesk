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
      let error;
      try {
        ({ data, error } = await authClient.updateUser({
          data: { display_name: displayName },
        }));
      } catch {
        await reconcileUnconfirmedProfile(displayName);
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }

      state.user = data.user || state.user;
      updateGreeting();
      toast("Display name saved");
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
