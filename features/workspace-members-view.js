/* Render and bind the workspace member roster and invitation form. */
(() => {
  "use strict";

  function create({ $, state, esc }) {
    function memberEmail() {
      return $("member-email").value.trim();
    }

    function clearMemberEmail() {
      $("member-email").value = "";
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

    function attachEvents({ addWorkspaceMember, removeWorkspaceMember }) {
      $("member-add-form").addEventListener("submit", addWorkspaceMember);
      $("workspace-members").addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-member]");
        if (removeButton)
          return removeWorkspaceMember(removeButton.dataset.removeMember);
      });
    }

    return {
      attachEvents,
      clearMemberEmail,
      memberEmail,
      renderWorkspaceMembers,
    };
  }

  window.PropertyDeskWorkspaceMembersView = Object.freeze({ create });
})();
