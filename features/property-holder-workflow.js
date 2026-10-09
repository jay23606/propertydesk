/* Compose property-holder label saving with its detail event router. */
(() => {
  "use strict";

  function createPropertyHolderWorkflow({
    $,
    getSelectedPropertyId,
    getWorkspaceOwnerId,
    getPropertyHolders,
    toast,
    fetchAll,
    repository,
    reconcileWorkspaceChange,
    refreshWorkspace,
    openPropertyDetails,
    workflows,
  }) {
    const { savePropertyHolders } = workflows.management.create({
      getSelectedPropertyId,
      getWorkspaceOwnerId,
      getPropertyHolders,
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
