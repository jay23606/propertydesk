/* PropertyDesk workspace member access and persistence workflows. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    view,
    refreshWorkspaceSettings,
    confirmAction = (message) => window.confirm(message),
  }) {
    async function addWorkspaceMember(event) {
      event.preventDefault();
      const email = view.memberEmail();
      if (!email) return;
      let error;
      try {
        ({ error } = await state.client.rpc("pd_add_workspace_member", {
          p_email: email,
        }));
      } catch {
        toast(
          "Workspace member couldn't be added right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      view.clearMemberEmail();
      try {
        await fetchAll();
      } catch {
        return;
      }
      refreshWorkspaceSettings();
      toast("Workspace member added");
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
      let error;
      try {
        ({ error } = await state.client.rpc("pd_remove_workspace_member", {
          p_member_user_id: memberId,
        }));
      } catch {
        toast(
          "Workspace member couldn't be removed right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
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
