/* Compose workspace settings with navigation to the settings view. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, esc, toast, fetchAll, renderReminderActivity } = context;
    const settings = window.PropertyDeskWorkspace.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
    });
    const { updateGreeting } = settings;
    function renderWorkspaceSettings() {
      settings.renderWorkspaceSettings();
      renderReminderActivity();
    }
    const navigation = window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings,
    });
    function attachEvents() {
      navigation.attachEvents();
      settings.attachEvents();
    }

    return {
      updateGreeting,
      navigate: navigation.navigate,
      attachEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
