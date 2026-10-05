/* Compose workspace settings, navigation, and app theme controls. */
(() => {
  "use strict";

  function create(context) {
    const settings = window.PropertyDeskWorkspaceSettingsWorkflow.create(context);
    const navigation = window.PropertyDeskNavigation.create({
      $: context.$,
      state: context.state,
      renderWorkspaceSettings: settings.renderWorkspaceSettings,
    });
    const theme = window.PropertyDeskTheme.create();

    return {
      navigate: navigation.navigate,
      previewReminderEmail: settings.previewReminderEmail,
      attachWorkspaceEvents: settings.attachWorkspaceEvents,
      attachNavigationEvents: navigation.attachEvents,
      attachThemeEvents: theme.attachEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
