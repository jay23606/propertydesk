/* Compose the profile display, editor, and saved profile update. */
(() => {
  "use strict";

  function create({ $, state, authClient, toast, writeFeedback, workflows }) {
    const profileDisplay = workflows.display.create({
      $,
      state,
    });
    const profileView = workflows.view.create({ $ });
    const profile = workflows.settings.create({
      state,
      authClient,
      toast,
      writeFeedback,
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
