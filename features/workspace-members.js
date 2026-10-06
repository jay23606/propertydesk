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
    const repository = window.PropertyDeskWorkspaceMemberRepository.create({
      getClient: () => state.client,
    });

    async function addWorkspaceMember(email) {
      if (!email) return;
      let error;
      try {
        ({ error } = await repository.addMember(email));
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
      let error;
      try {
        ({ error } = await repository.removeMember(memberId));
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
