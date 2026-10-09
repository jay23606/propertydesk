/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create({
    state,
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
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      makeId,
      repository,
      refreshWorkspace,
      describeUpload: modules.uploadPolicy.describe,
      maintenanceModule: modules.uploadMaintenance,
    });

    const { deletePropertyDocument, openPropertyDocument } =
      modules.actions.create({
        state,
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
