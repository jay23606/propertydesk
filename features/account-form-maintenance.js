/* Persist account form changes without owning detail-page actions. */
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
        collection: "accounts",
        recordLabel: "Account",
      });
    return Object.freeze({ saveAccount: saveRecord });
  }

  window.PropertyDeskAccountFormMaintenance = Object.freeze({ create });
})();
