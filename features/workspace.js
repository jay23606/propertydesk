/* PropertyDesk profile and Workspace settings composition. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    renderReminderActivity = () => {},
    memberRepository,
    confirmAction = (message) => window.confirm(message),
  }) {
    const profileDisplay = window.PropertyDeskProfileDisplay.create({
      $,
      state,
    });
    const { updateGreeting } = profileDisplay;
    const profileView = window.PropertyDeskProfileSettingsView.create({ $ });
    const profile = window.PropertyDeskProfileSettings.create({
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
      profileView.setDisplayName(state.user?.user_metadata?.display_name || "");
      memberView.renderWorkspaceMembers();
    }

    function renderWorkspacePage() {
      renderWorkspaceSettings();
      renderReminderActivity();
    }

    const members = window.PropertyDeskWorkspaceMembers.create({
      state,
      toast,
      fetchAll,
      view: memberView,
      refreshWorkspaceSettings: renderWorkspaceSettings,
      repository: memberRepository,
      confirmAction,
    });

    function attachProfileEvents() {
      profileView.attachEvents(profile.saveProfile);
    }

    function attachWorkspaceMemberEvents() {
      members.attachEvents();
    }

    return {
      updateGreeting,
      renderWorkspaceSettings: renderWorkspacePage,
      attachProfileEvents,
      attachWorkspaceMemberEvents,
    };
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
