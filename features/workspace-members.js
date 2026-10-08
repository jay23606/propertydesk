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
      if (
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          afterRefresh: refreshWorkspaceSettings,
          toast,
          successMessage: "Workspace member added",
        })
      )
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
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: refreshWorkspaceSettings,
        toast,
        successMessage: "Workspace access removed",
      });
    }

    function attachWorkspaceMemberEvents() {
      view.attachEvents({ addWorkspaceMember, removeWorkspaceMember });
    }

    return { attachWorkspaceMemberEvents };
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
