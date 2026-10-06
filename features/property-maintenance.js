/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, toast }) {
    async function updateProperty(propertyId, ownerId, values, failureMessage) {
      let error;
      try {
        ({ error } = await state.client
          .from("pd_properties")
          .update(values)
          .eq("id", propertyId)
          .eq("user_id", ownerId));
      } catch {
        toast(failureMessage);
        return false;
      }
      if (error) {
        toast(error.message);
        return false;
      }
      return true;
    }

    async function saveProperty(payload, propertyId) {
      let error;
      try {
        const query = propertyId
          ? state.client
              .from("pd_properties")
              .update(payload)
              .eq("id", propertyId)
          : state.client.from("pd_properties").insert(payload);
        ({ error } = await query);
      } catch {
        toast(
          "Property couldn't be saved right now. Check your connection and try again.",
        );
        return false;
      }
      if (error) {
        toast(error.message);
        return false;
      }
      return true;
    }

    function savePropertyQuickNote(propertyId, ownerId, note) {
      return updateProperty(
        propertyId,
        ownerId,
        { notes: note || null },
        "Property note couldn't be saved right now. Check your connection and try again.",
      );
    }

    function savePropertyArchive(propertyId, ownerId, archivedAt) {
      return updateProperty(
        propertyId,
        ownerId,
        { archived_at: archivedAt },
        "Property status couldn't be updated right now. Check your connection and try again.",
      );
    }

    return { saveProperty, savePropertyQuickNote, savePropertyArchive };
  }

  window.PropertyDeskPropertyMaintenance = Object.freeze({ create });
})();
