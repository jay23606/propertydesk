/* Save the workspace owner's display name in the authenticated account profile. */
(() => {
  "use strict";

  function createProfileSettings({ $, state, toast, updateGreeting }) {
    async function saveProfile(event) {
      event.preventDefault();
      const displayName = $("display-name").value.trim();
      if (!displayName) {
        toast("Enter a display name");
        return;
      }

      let data;
      let error;
      try {
        ({ data, error } = await state.client.auth.updateUser({
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

    function attachEvents() {
      $("display-name-form").addEventListener("submit", saveProfile);
    }

    return { saveProfile, attachEvents };
  }

  window.PropertyDeskProfileSettings = Object.freeze({
    create: createProfileSettings,
  });
})();
