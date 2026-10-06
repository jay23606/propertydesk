/* PropertyDesk profile and Workspace settings composition. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    updateGreeting,
    renderReminderActivity,
    confirmAction = (message) => window.confirm(message),
  }) {
    const profile = window.PropertyDeskProfileSettings.create({
      $,
      state,
      toast,
      updateGreeting,
    });
    const members = window.PropertyDeskWorkspaceMembers.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      refreshWorkspaceSettings: () => renderWorkspaceSettings(),
      confirmAction,
    });

    function renderWorkspaceSettings() {
      $("display-name").value = state.user?.user_metadata?.display_name || "";
      members.renderWorkspaceMembers();
      renderReminderActivity();
    }

    function attachEvents() {
      profile.attachEvents();
      members.attachEvents();
    }

    return {
      renderWorkspaceSettings,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspace = Object.freeze({ create });
})();
