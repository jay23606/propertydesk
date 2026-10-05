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
    const members = window.PropertyDeskWorkspaceMembers.create({
      $, state, esc, toast, fetchAll,
      refreshWorkspaceSettings: () => renderWorkspaceSettings(),
      confirmAction,
    });

    async function saveProfile(event) {
      event.preventDefault();
      const display_name = $("display-name").value.trim();
      if (!display_name) {
        toast("Enter a display name");
        return;
      }
      let data;
      let error;
      try {
        ({ data, error } = await state.client.auth.updateUser({
          data: { display_name },
        }));
      } catch {
        toast("Display name couldn't be saved right now. Check your connection and try again.");
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      state.user = data.user || state.user;
      updateGreeting();
      toast("Display name saved");
    }

    function renderWorkspaceSettings() {
      $("display-name").value = state.user?.user_metadata?.display_name || "";
      members.renderWorkspaceMembers();
      renderReminderActivity();
    }

    function attachEvents() {
      $("display-name-form").addEventListener("submit", saveProfile);
      members.attachEvents();
    }

    return {
      saveProfile,
      addWorkspaceMember: members.addWorkspaceMember,
      removeWorkspaceMember: members.removeWorkspaceMember,
      renderWorkspaceSettings,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspace = { create };
})();
