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
          "Workspace member addition result couldn't be confirmed. Reload workspace settings before trying again.",
      });
      if (!saved) return;
      if (
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          afterRefresh: refreshWorkspaceSettings,
          toast,
          successMessage: "Workspace member added",
          refreshFailureMessage:
            "Workspace member was added, but the workspace could not refresh. Reload to verify access.",
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
          "Workspace member removal result couldn't be confirmed. Reload workspace settings before trying again.",
      });
      if (!removed) return;
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: refreshWorkspaceSettings,
        toast,
        successMessage: "Workspace access removed",
        refreshFailureMessage:
          "Workspace access was removed, but the workspace could not refresh. Reload to verify access.",
      });
    }

    function attachWorkspaceMemberEvents() {
      view.attachEvents({ addWorkspaceMember, removeWorkspaceMember });
    }

    return Object.freeze({ attachWorkspaceMemberEvents });
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
