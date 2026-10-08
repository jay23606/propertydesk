/* PropertyDesk workspace member access and persistence workflows. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    view,
    maintenanceWorkflow,
    refreshWorkspaceSettings,
    repository,
    confirmAction,
  }) {
    const maintenance = maintenanceWorkflow.create({
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
