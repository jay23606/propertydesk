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
    workflows,
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
    const profileWorkflow = workflows.profile.create({
      $,
      state,
      authClient,
      toast,
      workflows: workflows.profileModules,
    });
    const memberView = workflows.memberView.create({
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

    const members = workflows.members.create({
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
