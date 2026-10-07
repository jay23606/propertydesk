/* Connect reminder tools with workspace settings and navigation. */
(() => {
  "use strict";

  function createWorkspaceShellWorkflow({ reminder, navigation }) {
    const reminders =
      window.PropertyDeskWorkspaceReminderWorkflow.create(reminder);
    const workspace = window.PropertyDeskWorkspaceNavigationWorkflow.create({
      $: navigation.$,
      state: navigation.state,
      esc: navigation.esc,
      toast: navigation.toast,
      fetchAll: navigation.fetchAll,
      renderReminderActivity: reminders.renderReminderActivity,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
      confirmAction: navigation.confirmAction,
    });

    return {
      previewReminderEmail: reminders.previewReminderEmail,
      updateGreeting: workspace.updateGreeting,
      attachProfileEvents: workspace.attachProfileEvents,
      attachWorkspaceMemberEvents: workspace.attachWorkspaceMemberEvents,
      navigate: workspace.navigate,
      attachNavigationEvents: workspace.attachNavigationEvents,
    };
  }

  window.PropertyDeskWorkspaceShellWorkflow = Object.freeze({
    create: createWorkspaceShellWorkflow,
  });
})();
