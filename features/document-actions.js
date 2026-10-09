/* Compose independent private-agreement deletion and opening actions. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm,
    openWindow,
    repository,
    writeFeedback,
    modules,
  }) {
    const { deletePropertyDocument } = modules.delete.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      confirm,
      repository,
      writeFeedback,
      maintenanceModule: modules.deleteMaintenance,
    });
    const { openPropertyDocument } = modules.open.create({
      state,
      toast,
      openWindow,
      repository,
    });

    return Object.freeze({ deletePropertyDocument, openPropertyDocument });
  }

  window.PropertyDeskDocumentActions = Object.freeze({ create });
})();
