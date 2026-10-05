/* Archive or restore a property while preserving its records. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, todayIso, openPropertyDetails }) {
    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;

      const archived_at = property.archived_at ? null : todayIso();
      let error;
      try {
        ({ error } = await state.client
          .from("pd_properties")
          .update({ archived_at })
          .eq("id", id)
          .eq("user_id", state.workspaceOwnerId));
      } catch {
        toast(
          "Property status couldn't be updated right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
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
