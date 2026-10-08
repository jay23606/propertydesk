/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({
    state,
    fetchAll,
    toast,
    repository,
    writeFeedback,
    selectRecordWriteCompletion,
  }) {
    const { saveRecord } =
      window.PropertyDeskWorkspaceRecordSaveMaintenance.create({
        state,
        fetchAll,
        toast,
        repository,
        writeFeedback,
        selectRecordWriteCompletion,
        collection: "properties",
        recordLabel: "Property",
      });
    return Object.freeze({ saveProperty: saveRecord });
  }

  window.PropertyDeskPropertySaveMaintenance = Object.freeze({ create });
})();
