/* Call the server-side workspace membership procedures. */
(() => {
  "use strict";

  function create({ getClient }) {
    function addMember(email) {
      return getClient().rpc("pd_add_workspace_member", {
        p_email: email,
      });
    }

    function removeMember(memberId) {
      return getClient().rpc("pd_remove_workspace_member", {
        p_member_user_id: memberId,
      });
    }

    return { addMember, removeMember };
  }

  window.PropertyDeskWorkspaceMemberRepository = Object.freeze({ create });
})();
