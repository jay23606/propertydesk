/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({
    state,
    fetchAll,
    toast,
    repository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
    recordSaveMaintenance,
  }) {
    const { saveRecord } = recordSaveMaintenance.create({
      state,
      fetchAll,
      toast,
      repository,
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion,
      collection: "accounts",
      recordLabel: "Account",
    });
    return Object.freeze({ saveAccount: saveRecord });
  }

  window.PropertyDeskAccountFormMaintenance = Object.freeze({ create });
})();
