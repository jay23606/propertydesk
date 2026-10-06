/* PropertyDesk profile and Workspace settings composition. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    confirmAction = (message) => window.confirm(message),
  }) {
    const profileDisplay = window.PropertyDeskProfileDisplay.create({
      $,
      state,
    });
    const { updateGreeting } = profileDisplay;
    const profile = window.PropertyDeskProfileSettings.create({
      $,
      state,
      toast,
      updateGreeting,
    });
    const memberView = window.PropertyDeskWorkspaceMembersView.create({
      $,
      state,
      esc,
    });

    function renderWorkspaceSettings() {
      $("display-name").value = state.user?.user_metadata?.display_name || "";
      memberView.renderWorkspaceMembers();
    }

    const members = window.PropertyDeskWorkspaceMembers.create({
      state,
      toast,
      fetchAll,
      view: memberView,
      refreshWorkspaceSettings: renderWorkspaceSettings,
      confirmAction,
    });

    function attachEvents() {
      profile.attachEvents();
      members.attachEvents();
    }

    return {
      updateGreeting,
      renderWorkspaceSettings,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
