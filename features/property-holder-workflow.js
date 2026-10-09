/* Compose property-holder label saving with its detail event router. */
(() => {
  "use strict";

  function createPropertyHolderWorkflow({
    $,
    state,
    toast,
    fetchAll,
    repository,
    writeFeedback,
    openPropertyDetails,
    workflows,
  }) {
    const { savePropertyHolders } = workflows.management.create({
      state,
      toast,
      fetchAll,
      repository,
      reconcileWorkspaceChange: writeFeedback.reconcileWorkspaceChange,
      refreshWorkspace: writeFeedback.refreshWorkspace,
      openPropertyDetails,
    });
    const { attachPropertyHolderEvents } = workflows.events.create({
      $,
      savePropertyHolders,
    });

    return Object.freeze({ attachPropertyHolderEvents });
  }

  window.PropertyDeskPropertyHolderWorkflow = Object.freeze({
    create: createPropertyHolderWorkflow,
  });
})();
