/* Compose workspace settings, navigation, and reminder activity. */
(() => {
  "use strict";

  function create({ $, state, esc, toast, fetchAll, renderReminderActivity }) {
    const workspace = window.PropertyDeskWorkspace.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
    });

    function renderWorkspaceSettings() {
      workspace.renderWorkspaceSettings();
      renderReminderActivity();
    }

    const navigation = window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings,
    });

    return {
      updateGreeting: workspace.updateGreeting,
      navigate: navigation.navigate,
      attachNavigationEvents: navigation.attachEvents,
      attachProfileEvents: workspace.attachProfileEvents,
      attachWorkspaceMemberEvents: workspace.attachWorkspaceMemberEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
