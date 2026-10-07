/* Compose workspace member roster rendering and membership event handling. */
(() => {
  "use strict";

  function create(context) {
    const memberView = window.PropertyDeskWorkspaceMembersView.create({
      $: context.$,
      state: context.state,
      esc: context.esc,
    });
    const members = window.PropertyDeskWorkspaceMembers.create({
      state: context.state,
      toast: context.toast,
      fetchAll: context.fetchAll,
      view: memberView,
      refreshWorkspaceSettings: context.refreshWorkspaceSettings,
      repository: context.repository,
      confirmAction: context.confirmAction,
    });

    return {
      renderWorkspaceMembers: memberView.renderWorkspaceMembers,
      attachWorkspaceMemberEvents: members.attachWorkspaceMemberEvents,
    };
  }

  window.PropertyDeskWorkspaceMembersWorkflow = Object.freeze({ create });
})();
