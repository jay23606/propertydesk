/* Compose workspace settings with its reminder delivery history. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, esc, toast, fetchAll, updateGreeting, renderReminderActivity,
    } = context;
    const {
      renderWorkspaceSettings,
      attachEvents: attachWorkspaceEvents,
    } = window.PropertyDeskWorkspace.create({
      $, state, esc, toast, fetchAll, updateGreeting, renderReminderActivity,
    });

    return {
      renderWorkspaceSettings,
      attachWorkspaceEvents,
    };
  }

  window.PropertyDeskWorkspaceSettingsWorkflow = Object.freeze({ create });
})();
