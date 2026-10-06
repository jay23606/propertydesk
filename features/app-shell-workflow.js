/* Compose workspace settings with app navigation and theme controls. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      esc,
      toast,
      fetchAll,
      renderReminderActivity,
      previewReminderEmail,
    } = context;
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
    const theme = window.PropertyDeskTheme.create();

    function attachEvents() {
      theme.attachEvents();
      navigation.attachEvents();
      settings.attachEvents();
    }

    return {
      updateGreeting,
      navigate: navigation.navigate,
      previewReminderEmail,
      attachEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
