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
        toast,
        repository,
      });

    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;

      const archived_at = property.archived_at ? null : todayIso();
      if (!(await savePropertyArchive(id, state.workspaceOwnerId, archived_at)))
        return;
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: () => openPropertyDetails(id),
        toast,
        successMessage: archived_at ? "Property archived" : "Property restored",
        refreshFailureMessage: archived_at
          ? "Property was archived, but the workspace could not refresh. Reload to verify its status."
          : "Property was restored, but the workspace could not refresh. Reload to verify its status.",
      });
    }

    return Object.freeze({ toggleArchiveProperty });
  }

  window.PropertyDeskPropertyArchive = Object.freeze({ create });
})();
