/* Compose Workspace member settings and the settings-page renderer. */
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
    authClient,
    confirmAction = (message) => window.confirm(message),
  }) {
    const profileWorkflow = window.PropertyDeskWorkspaceProfileWorkflow.create({
      $,
      state,
      authClient,
      toast,
    });
    const memberView = window.PropertyDeskWorkspaceMembersView.create({
      $,
      state,
      esc,
    });

    function renderWorkspaceSettings() {
      profileWorkflow.renderProfileSettings();
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

    function attachWorkspaceMemberEvents() {
      members.attachEvents();
    }

    return {
      updateGreeting: profileWorkflow.updateGreeting,
      renderWorkspaceSettings: renderWorkspacePage,
      attachProfileEvents: profileWorkflow.attachProfileEvents,
      attachWorkspaceMemberEvents,
    };
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
