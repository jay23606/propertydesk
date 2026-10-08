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
      window.PropertyDeskPropertyMaintenance.create({
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
      let reconciled = false;
      const saved = await savePropertyArchive(
        id,
        state.workspaceOwnerId,
        archived_at,
        ({ recordWasSaved }) => {
          openPropertyDetails(id);
          if (!recordWasSaved) return;
          reconciled = true;
          toast(archiveSuccessMessage(archived_at));
        },
      );
      if (!saved || reconciled) return;
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: () => openPropertyDetails(id),
        toast,
        successMessage: archiveSuccessMessage(archived_at),
        refreshFailureMessage: archived_at
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
