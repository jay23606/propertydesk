/* Persist property creation and edits independently of form presentation. */
(() => {
  "use strict";

  function create({ state, toast }) {
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

    return { saveProperty };
  }

  window.PropertyDeskPropertyMaintenance = Object.freeze({ create });
})();
