/* Compose independent private-agreement deletion and opening actions. */
(() => {
  "use strict";

  function create({
    getSelectedPropertyId,
    getWorkspaceOwnerId,
    getDocuments,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm,
    openWindow,
    repository,
    refreshWorkspace,
    modules,
  }) {
    const { deletePropertyDocument } = modules.delete.create({
      getSelectedPropertyId,
      getWorkspaceOwnerId,
      getDocuments,
      toast,
      fetchAll,
      openPropertyDetails,
      confirm,
      repository: {
        remove: repository.remove,
        deleteMetadata: repository.deleteMetadata,
      },
      refreshWorkspace,
      maintenanceModule: modules.deleteMaintenance,
    });
    const { openPropertyDocument } = modules.open.create({
      getWorkspaceOwnerId,
      getDocuments,
      toast,
      openWindow,
      repository: { signedUrl: repository.signedUrl },
    });

    return Object.freeze({ deletePropertyDocument, openPropertyDocument });
  }

  window.PropertyDeskDocumentActions = Object.freeze({ create });
})();
