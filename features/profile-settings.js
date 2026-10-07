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
        toast(
          "Display name couldn't be saved right now. Check your connection and try again.",
        );
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

    return { saveProfile };
  }

  window.PropertyDeskProfileSettings = Object.freeze({
    create: createProfileSettings,
  });
})();
