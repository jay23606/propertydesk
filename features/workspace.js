/* PropertyDesk profile and workspace-member workflows. */
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
        toast("Workspace member couldn't be added right now. Check your connection and try again.");
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
      renderWorkspaceSettings();
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
        toast("Workspace member couldn't be removed right now. Check your connection and try again.");
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
      renderWorkspaceSettings();
      toast("Workspace access removed");
    }

    function renderWorkspaceSettings() {
      $("display-name").value = state.user?.user_metadata?.display_name || "";
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
      renderReminderActivity();
    }

    function attachEvents() {
      $("display-name-form").addEventListener("submit", saveProfile);
      $("member-add-form").addEventListener("submit", addWorkspaceMember);
      $("workspace-members").addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-member]");
        if (removeButton) {
          removeWorkspaceMember(removeButton.dataset.removeMember);
        }
      });
    }

    return {
      saveProfile,
      addWorkspaceMember,
      removeWorkspaceMember,
      renderWorkspaceSettings,
      attachEvents,
    };
  }

  window.PropertyDeskWorkspace = { create };
})();
