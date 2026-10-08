/* Archive or restore a property while preserving its records. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
    repository,
  }) {
    const { savePropertyArchive } =
      window.PropertyDeskPropertyStatusMaintenance.create({
        state,
        fetchAll,
        toast,
        repository,
      });

    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;

      const archived_at = property.archived_at ? null : todayIso();
      await savePropertyArchive({
        propertyId: id,
        ownerId: state.workspaceOwnerId,
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
