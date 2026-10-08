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
      return window.PropertyDeskRepositoryWriteFeedback.runAndRefreshWorkspaceChange(
        {
          operation: () => repository.addMember(email),
          fetchAll,
          isConfirmed: () => memberWithEmailExists(email),
          toast,
          failureMessage:
            "Workspace member addition result couldn't be confirmed. Reload workspace settings before trying again.",
          refreshFailureMessage:
            "Workspace member addition result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
          retryMessage:
            "Workspace member addition wasn't confirmed. Check settings before retrying.",
          afterRefresh: refreshWorkspaceSettings,
          successMessage: "Workspace member added",
          savedRefreshFailureMessage:
            "Workspace member was added, but the workspace could not refresh. Reload to verify access.",
          onReconciled: () => toast("Workspace member added"),
        },
      );
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
      return window.PropertyDeskRepositoryWriteFeedback.runAndRefreshWorkspaceChange(
        {
          operation: () => repository.removeMember(memberId),
          fetchAll,
          isConfirmed: () =>
            !state.workspaceMembers.some(
              (item) => item.member_user_id === memberId,
            ),
          toast,
          failureMessage:
            "Workspace member removal result couldn't be confirmed. Reload workspace settings before trying again.",
          refreshFailureMessage:
            "Workspace member removal result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
          retryMessage:
            "Workspace member still appears in settings. Check access before retrying.",
          afterRefresh: refreshWorkspaceSettings,
          successMessage: "Workspace access removed",
          savedRefreshFailureMessage:
            "Workspace access was removed, but the workspace could not refresh. Reload to verify access.",
          onReconciled: () => toast("Workspace access removed"),
        },
      );
    }

    function attachWorkspaceMemberEvents() {
      view.attachEvents({ addWorkspaceMember, removeWorkspaceMember });
    }

    return Object.freeze({ attachWorkspaceMemberEvents });
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
