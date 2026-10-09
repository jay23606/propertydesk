/* Compose archive and action workflows for property details. */
(() => {
  "use strict";

  function createPropertyDetailManagementWorkflow({
    $,
    getSelectedPropertyId,
    getProperties,
    getWorkspaceOwnerId,
    getAccounts,
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
      getSelectedPropertyId,
      getProperty: (propertyId) =>
        getProperties().find((property) => property.id === propertyId) || null,
      getWorkspaceOwnerId,
      getCollection: (collection) =>
        collection === "properties" ? getProperties() : null,
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
          getAccounts().find((account) => account.id === accountId) || null,
        closeModal,
        editAccount,
        openAccountDetails,
      });
    const { attachEvents: attachPropertyQuickActionEvents } =
      workflows.quickActions.create({
        $,
        getSelectedPropertyId,
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
