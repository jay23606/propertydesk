/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create({
    getSelectedPropertyId,
    getWorkspaceOwnerId,
    getDocuments,
    toast,
    fetchAll,
    openPropertyDetails,
    makeId,
    confirm,
    openWindow,
    repository,
    refreshWorkspace,
    modules,
  }) {
    const { uploadPropertyDocument } = modules.upload.create({
      getSelectedPropertyId,
      getWorkspaceOwnerId,
      getDocuments,
      toast,
      fetchAll,
      openPropertyDetails,
      makeId,
      repository: {
        upload: repository.upload,
        insertMetadata: repository.insertMetadata,
        remove: repository.remove,
      },
      refreshWorkspace,
      describeUpload: modules.uploadPolicy.describe,
      maintenanceModule: modules.uploadMaintenance,
    });

    const { deletePropertyDocument, openPropertyDocument } =
      modules.actions.create({
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
        modules: modules.actions.modules,
      });

    return Object.freeze({
      uploadPropertyDocument,
      deletePropertyDocument,
      openPropertyDocument,
    });
  }

  window.PropertyDeskDocuments = Object.freeze({ create });
})();
