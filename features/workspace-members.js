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
    confirmAction,
  }) {
    const maintenance = window.PropertyDeskWorkspaceMemberMaintenance.create({
      state,
      toast,
      fetchAll,
      refreshWorkspaceSettings,
      repository,
      confirmAction,
    });

    function attachWorkspaceMemberEvents() {
      view.attachEvents(maintenance);
    }

    return Object.freeze({ attachWorkspaceMemberEvents });
  }

  window.PropertyDeskWorkspaceMembers = Object.freeze({ create });
})();
