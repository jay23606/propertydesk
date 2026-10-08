/* Compose Workspace settings, member access, and reminder activity. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    reminder,
    memberRepository,
    authClient,
    confirmAction = (message) => window.confirm(message),
  }) {
    const reminderWorkflow = reminder.workflow.create({
      $: reminder.$,
      state: reminder.state,
      esc: reminder.esc,
      fmtDate: reminder.fmtDate,
      money: reminder.money,
      activityModelWorkflow: reminder.activityModelWorkflow,
      activityViewWorkflow: reminder.activityViewWorkflow,
    });
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
      reminderWorkflow.renderReminderActivity();
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

    return Object.freeze({
      updateGreeting: profileWorkflow.updateGreeting,
      renderWorkspacePage,
      attachProfileEvents: profileWorkflow.attachProfileEvents,
      attachWorkspaceMemberEvents: members.attachWorkspaceMemberEvents,
    });
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
