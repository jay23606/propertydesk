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
    function memberWithEmailExists(email) {
      const normalizedEmail = email.trim().toLowerCase();
      return state.workspaceMembers.some(
        (member) =>
          String(member.email || "")
            .trim()
            .toLowerCase() === normalizedEmail,
      );
    }

    async function addWorkspaceMember(email) {
      if (!email) return;
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.addMember(email),
        toast,
        failureMessage:
          "Workspace member addition result couldn't be confirmed. Reload workspace settings before trying again.",
        onUnconfirmed: async () => {
          let added = false;
          const refreshed =
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => {
                refreshWorkspaceSettings();
                added = memberWithEmailExists(email);
              },
              toast,
              refreshFailureMessage:
                "Workspace member addition result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
            });
          if (!refreshed) return false;
          reconciled = added;
          toast(
            added
              ? "Workspace member added"
              : "Workspace member addition wasn't confirmed. Check settings before retrying.",
          );
          return added;
        },
      });
      if (!saved) return;
      if (reconciled) return true;
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
      let reconciled = false;
      const removed = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.removeMember(memberId),
        toast,
        failureMessage:
          "Workspace member removal result couldn't be confirmed. Reload workspace settings before trying again.",
        onUnconfirmed: async () => {
          let memberRemains = true;
          const refreshed =
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => {
                refreshWorkspaceSettings();
                memberRemains = state.workspaceMembers.some(
                  (item) => item.member_user_id === memberId,
                );
              },
              toast,
              refreshFailureMessage:
                "Workspace member removal result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
            });
          if (!refreshed) return false;
          reconciled = !memberRemains;
          toast(
            reconciled
              ? "Workspace access removed"
              : "Workspace member still appears in settings. Check access before retrying.",
          );
          return reconciled;
        },
      });
      if (!removed) return;
      if (reconciled) return;
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
