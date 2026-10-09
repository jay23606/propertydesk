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
    function getReminderActivityData() {
      return {
        accounts: state.accounts.map(
          ({ id, property_id, party_name, name }) => ({
            id,
            property_id,
            party_name,
            name,
          }),
        ),
        properties: state.properties.map(({ id, address, name }) => ({
          id,
          address,
          name,
        })),
        reminderLogs: state.reminderLogs.map(
          ({
            account_id,
            reminder_month,
            recipient_index,
            status,
            reason,
            unpaid_due,
            attempted_at,
          }) => ({
            account_id,
            reminder_month,
            recipient_index,
            status,
            reason,
            unpaid_due,
            attempted_at,
          }),
        ),
      };
    }

    const reminderWorkflow = reminder.workflow.create({
      $: reminder.$,
      getActivityData: getReminderActivityData,
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
