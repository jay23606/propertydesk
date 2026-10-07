/* Archive or restore a property while preserving its records. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, todayIso, openPropertyDetails }) {
    const { savePropertyArchive } =
      window.PropertyDeskPropertyMaintenance.create({
        state,
        toast,
        repository: window.PropertyDeskPropertyRepository,
      });

    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;

      const archived_at = property.archived_at ? null : todayIso();
      if (!(await savePropertyArchive(id, state.workspaceOwnerId, archived_at)))
        return;
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(id);
      toast(archived_at ? "Property archived" : "Property restored");
    }

    return { toggleArchiveProperty };
  }

  window.PropertyDeskPropertyArchive = Object.freeze({ create });
})();
