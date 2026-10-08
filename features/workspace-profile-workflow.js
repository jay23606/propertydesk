/* Compose the profile display, editor, and saved profile update. */
(() => {
  "use strict";

  function create({ $, state, authClient, toast }) {
    const profileDisplay = window.PropertyDeskProfileDisplay.create({
      $,
      state,
    });
    const profileView = window.PropertyDeskProfileSettingsView.create({ $ });
    const profile = window.PropertyDeskProfileSettings.create({
      state,
      authClient,
      toast,
      updateGreeting: profileDisplay.updateGreeting,
    });

    function renderProfileSettings() {
      profileView.setDisplayName(state.user?.user_metadata?.display_name || "");
    }

    function attachProfileEvents() {
      profileView.attachEvents(profile.saveProfile);
    }

    return Object.freeze({
      updateGreeting: profileDisplay.updateGreeting,
      renderProfileSettings,
      attachProfileEvents,
    });
  }

  window.PropertyDeskWorkspaceProfileWorkflow = Object.freeze({ create });
})();
