/* Connect reminder tools with workspace settings and navigation. */
(() => {
  "use strict";

  function createWorkspaceShellWorkflow({ reminder, navigation }) {
    const reminders =
      window.PropertyDeskWorkspaceReminderWorkflow.create(reminder);
    const workspace = window.PropertyDeskWorkspaceNavigationWorkflow.create({
      ...navigation,
      renderReminderActivity: reminders.renderReminderActivity,
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
