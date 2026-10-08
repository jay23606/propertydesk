/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, fetchAll, toast, repository }) {
    const { saveRecord } =
      window.PropertyDeskWorkspaceRecordSaveMaintenance.create({
        state,
        fetchAll,
        toast,
        repository,
        collection: "properties",
        recordLabel: "Property",
      });
    return Object.freeze({ saveProperty: saveRecord });
  }

  window.PropertyDeskPropertySaveMaintenance = Object.freeze({ create });
})();
