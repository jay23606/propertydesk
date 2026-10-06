/* PropertyDesk workspace member access and roster workflows. */
(() => {
  "use strict";

  function create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    refreshWorkspaceSettings,
    confirmAction = (message) => window.confirm(message),
  }) {
    async function addWorkspaceMember(event) {
      event.preventDefault();
      const email = $("member-email").value.trim();
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
      $("member-email").value = "";
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

    function renderWorkspaceMembers() {
      $("workspace-members").innerHTML = state.workspaceMembers
        .map(
          (member) => `
        <div class="member-row"><div><strong>${esc(member.display_name || member.email)}</strong><small>${esc(member.email)}${member.is_owner ? " · Owner" : " · Full workspace access"}</small></div>
        ${member.is_owner ? '<span class="kind-pill">Owner</span>' : `<button class="text-button" type="button" data-remove-member="${esc(member.member_user_id)}">Remove</button>`}</div>`,
        )
        .join("");
      $("member-add-form").classList.toggle(
        "hidden",
        state.workspaceOwnerId !== state.user?.id,
      );
    }

    function attachEvents() {
      $("member-add-form").addEventListener("submit", (event) =>
        addWorkspaceMember(event),
      );
      $("workspace-members").addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-member]");
        if (removeButton) {
          return removeWorkspaceMember(removeButton.dataset.removeMember);
        }
      });
    }

    return {
      renderWorkspaceMembers,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
