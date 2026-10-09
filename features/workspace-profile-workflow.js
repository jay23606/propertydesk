/* Compose the profile display, editor, and saved profile update. */
(() => {
  "use strict";

  function create({
    $,
    getUser,
    setUser,
    now,
    authClient,
    toast,
    run,
    workflows,
  }) {
    const profileDisplay = workflows.display.create({
      $,
      getUser,
      now,
    });
    const profileView = workflows.view.create({ $ });
    const profile = workflows.settings.create({
      getUser,
      setUser,
      authClient: {
        getUser: authClient.getUser,
        updateUser: authClient.updateUser,
      },
      toast,
      run,
      updateGreeting: profileDisplay.updateGreeting,
    });

    function renderProfileSettings() {
      profileView.setDisplayName(getUser()?.user_metadata?.display_name || "");
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
