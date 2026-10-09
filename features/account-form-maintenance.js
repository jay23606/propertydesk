/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({
    getAccounts,
    fetchAll,
    toast,
    repository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
    recordSaveMaintenance,
  }) {
    const { saveRecord } = recordSaveMaintenance.create({
      getRecords: getAccounts,
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
