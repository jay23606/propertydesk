/* Compose workspace settings, navigation, and app theme controls. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      esc,
      toast,
      fetchAll,
      updateGreeting,
      renderReminderActivity,
    } = context;
    const settings = window.PropertyDeskWorkspace.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      updateGreeting,
      renderReminderActivity,
    });
    const navigation = window.PropertyDeskNavigation.create({
      $: context.$,
      state: context.state,
      renderWorkspaceSettings: settings.renderWorkspaceSettings,
    });
    const theme = window.PropertyDeskTheme.create();

    function attachEvents() {
      theme.attachEvents();
      navigation.attachEvents();
      settings.attachEvents();
    }

    return {
      navigate: navigation.navigate,
      attachEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
