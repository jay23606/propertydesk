/* Persist workspace member changes and reconcile uncertain responses. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    refreshWorkspaceSettings,
    repository,
    writeFeedback,
    confirmAction,
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

    function persistMembershipChange({
      operation,
      isConfirmed,
      failureMessage,
      refreshFailureMessage,
      retryMessage,
      successMessage,
      savedRefreshFailureMessage,
    }) {
      return writeFeedback.runAndRefreshWorkspaceChange({
        operation,
        fetchAll,
        isConfirmed,
        toast,
        failureMessage,
        refreshFailureMessage,
        retryMessage,
        afterRefresh: refreshWorkspaceSettings,
        successMessage,
        savedRefreshFailureMessage,
        onReconciled: () => toast(successMessage),
      });
    }

    async function addWorkspaceMember(email) {
      if (!email) return;
      return persistMembershipChange({
        operation: () => repository.addMember(email),
        isConfirmed: () => memberWithEmailExists(email),
        failureMessage:
          "Workspace member addition result couldn't be confirmed. Reload workspace settings before trying again.",
        refreshFailureMessage:
          "Workspace member addition result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
        retryMessage:
          "Workspace member addition wasn't confirmed. Check settings before retrying.",
        successMessage: "Workspace member added",
        savedRefreshFailureMessage:
          "Workspace member was added, but the workspace could not refresh. Reload to verify access.",
      });
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
      return persistMembershipChange({
        operation: () => repository.removeMember(memberId),
        isConfirmed: () =>
          !state.workspaceMembers.some(
            (item) => item.member_user_id === memberId,
          ),
        failureMessage:
          "Workspace member removal result couldn't be confirmed. Reload workspace settings before trying again.",
        refreshFailureMessage:
          "Workspace member removal result couldn't be confirmed, and settings could not refresh. Reload before retrying.",
        retryMessage:
          "Workspace member still appears in settings. Check access before retrying.",
        successMessage: "Workspace access removed",
        savedRefreshFailureMessage:
          "Workspace access was removed, but the workspace could not refresh. Reload to verify access.",
      });
    }

    return Object.freeze({ addWorkspaceMember, removeWorkspaceMember });
  }

  window.PropertyDeskWorkspaceMemberMaintenance = Object.freeze({ create });
})();
