/* Archive or restore a property while preserving its records. */
(() => {
  "use strict";

  function create({
    getSelectedPropertyId,
    getProperty,
    getWorkspaceOwnerId,
    getCollection,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
    repository,
    saveAndRefreshWorkspaceRecord,
    statusMaintenance,
    recordUpdateMaintenance,
  }) {
    const { savePropertyArchive } = statusMaintenance.create({
      getCollection,
      fetchAll,
      toast,
      repository,
      saveAndRefreshWorkspaceRecord,
      recordUpdateMaintenance,
    });

    async function toggleArchiveProperty() {
      const id = getSelectedPropertyId();
      const property = getProperty(id);
      if (!property) return;

      const archived_at = property.archived_at ? null : todayIso();
      await savePropertyArchive({
        propertyId: id,
        ownerId: getWorkspaceOwnerId(),
        archivedAt: archived_at,
        onRefreshed: ({ recordWasSaved }) => {
          openPropertyDetails(id);
          if (!recordWasSaved) return;
          toast(archiveSuccessMessage(archived_at));
        },
        afterRefresh: () => openPropertyDetails(id),
        successMessage: archiveSuccessMessage(archived_at),
        savedRefreshFailureMessage: archived_at
          ? "Property was archived, but the workspace could not refresh. Reload to verify its status."
          : "Property was restored, but the workspace could not refresh. Reload to verify its status.",
      });
    }

    function archiveSuccessMessage(archivedAt) {
      return archivedAt ? "Property archived" : "Property restored";
    }

    return Object.freeze({ toggleArchiveProperty });
  }

  window.PropertyDeskPropertyArchive = Object.freeze({ create });
})();
