/* PropertyDesk workspace member access and persistence workflows. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    view,
    refreshWorkspaceSettings,
    repository,
    confirmAction = (message) => window.confirm(message),
  }) {
    async function addWorkspaceMember(email) {
      if (!email) return;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.addMember(email),
        toast,
        failureMessage:
          "Workspace member couldn't be added right now. Check your connection and try again.",
      });
      if (!saved) return;
      try {
        await fetchAll();
      } catch {
        return;
      }
      refreshWorkspaceSettings();
      toast("Workspace member added");
      return true;
    }

    async function removeWorkspaceMember(memberId) {
      const member = state.workspaceMembers.find(
        (item) => item.member_user_id === memberId,
      );
      if (
        !member ||
        !confirmAction(
          `Remove ${member.display_name || member.email} from this workspace?`,
        )
      )
        return;
      const removed = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.removeMember(memberId),
        toast,
        failureMessage:
          "Workspace member couldn't be removed right now. Check your connection and try again.",
      });
      if (!removed) return;
      try {
        await fetchAll();
      } catch {
        return;
      }
      refreshWorkspaceSettings();
      toast("Workspace access removed");
    }

    function attachEvents() {
      view.attachEvents({ addWorkspaceMember, removeWorkspaceMember });
    }

    return {
      renderWorkspaceMembers: view.renderWorkspaceMembers,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
