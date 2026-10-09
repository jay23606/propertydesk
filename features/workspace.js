/* Compose Workspace settings, member access, and reminder activity. */
(() => {
  "use strict";

  function create({
    $,
    state,
    now,
    esc,
    toast,
    fetchAll,
    reminder,
    memberRepository,
    authClient,
    run,
    runAndRefreshWorkspaceChange,
    workflows,
    confirmAction,
  }) {
    const reminderWorkflow = reminder.workflow.create({
      $: reminder.$,
      state: reminder.state,
      esc: reminder.esc,
      fmtDate: reminder.fmtDate,
      fmtDateTime: reminder.fmtDateTime,
      money: reminder.money,
      activityModelWorkflow: reminder.activityModelWorkflow,
      activityViewWorkflow: reminder.activityViewWorkflow,
    });
    const profileWorkflow = workflows.profile.create({
      $,
      state,
      now,
      authClient,
      toast,
      run,
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
      maintenanceWorkflow: workflows.memberMaintenance,
      refreshWorkspaceSettings: renderWorkspaceSettings,
      repository: memberRepository,
      runAndRefreshWorkspaceChange,
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
