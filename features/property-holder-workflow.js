/* Compose property-holder label saving with its detail event router. */
(() => {
  "use strict";

  function createPropertyHolderWorkflow({
    $,
    state,
    toast,
    fetchAll,
    repository,
    reconcileWorkspaceChange,
    refreshWorkspace,
    openPropertyDetails,
    workflows,
  }) {
    const { savePropertyHolders } = workflows.management.create({
      state,
      toast,
      fetchAll,
      repository,
      reconcileWorkspaceChange,
      refreshWorkspace,
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
