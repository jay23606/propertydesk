/* Compose profile and member workflows with the Workspace page renderer. */
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
    function renderWorkspaceSettings() {
      profileWorkflow.renderProfileSettings();
      members.renderWorkspaceMembers();
    }

    function renderWorkspacePage() {
      renderWorkspaceSettings();
      renderReminderActivity();
    }

    const members = window.PropertyDeskWorkspaceMembersWorkflow.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      refreshWorkspaceSettings: renderWorkspaceSettings,
      repository: memberRepository,
      confirmAction,
    });

    return {
      updateGreeting: profileWorkflow.updateGreeting,
      renderWorkspacePage,
      attachProfileEvents: profileWorkflow.attachProfileEvents,
      attachWorkspaceMemberEvents: members.attachWorkspaceMemberEvents,
    };
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
