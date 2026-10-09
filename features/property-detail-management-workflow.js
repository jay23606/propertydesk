/* Compose archive and action workflows for property details. */
(() => {
  "use strict";

  function createPropertyDetailManagementWorkflow({
    $,
    state,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
    closeModal,
    editAccount,
    openAccountDetails,
    openPayment,
    openExpense,
    openAccountForProperty,
    propertyRepository,
    saveAndRefreshWorkspaceRecord,
    workflows,
  }) {
    const { toggleArchiveProperty } = workflows.archive.create({
      getSelectedPropertyId: () => state.selectedPropertyId,
      getProperty: (propertyId) =>
        state.properties.find((property) => property.id === propertyId) || null,
      getWorkspaceOwnerId: () => state.workspaceOwnerId,
      getCollection: (collection) =>
        collection === "properties" ? state.properties : null,
      toast,
      fetchAll,
      todayIso,
      openPropertyDetails,
      repository: propertyRepository,
      saveAndRefreshWorkspaceRecord,
      statusMaintenance: workflows.statusMaintenance,
      recordUpdateMaintenance: workflows.recordUpdateMaintenance,
    });
    const { attachEvents: attachPropertyDetailEvents } =
      workflows.detailEvents.create({
        $,
        getAccount: (accountId) =>
          state.accounts.find((account) => account.id === accountId) || null,
        closeModal,
        editAccount,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActionEvents } =
      workflows.quickActions.create({
        $,
        getSelectedPropertyId: () => state.selectedPropertyId,
        closeModal,
        openPayment,
        openExpense,
        openAccountForProperty,
        toggleArchiveProperty,
      });
    return Object.freeze({
      attachPropertyDetailEvents,
      attachPropertyQuickActionEvents,
    });
  }

  window.PropertyDeskPropertyDetailManagementWorkflow = Object.freeze({
    create: createPropertyDetailManagementWorkflow,
  });
})();
