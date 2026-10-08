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
    recordSaveMaintenance,
  }) {
    const { saveRecord } = recordSaveMaintenance.create({
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
