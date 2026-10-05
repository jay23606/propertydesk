/* PropertyDesk member labels and property archive workflows. */
(() => {
  "use strict";

  function create({
    state, toast, fetchAll, todayIso, openPropertyDetails,
    documentRef = document,
  }) {
    async function savePropertyHolders() {
      const id = state.selectedPropertyId;
      const selected = [...documentRef.querySelectorAll("[data-holder-choice]:checked")]
        .map((input) => input.value);
      if (!id) return;
      let deleteError;
      try {
        ({ error: deleteError } = await state.client.from("pd_property_holders")
          .delete()
          .eq("user_id", state.workspaceOwnerId)
          .eq("property_id", id));
      } catch {
        toast("Account-holder labels couldn't be saved right now. Check your connection and try again.");
        return;
      }
      if (deleteError) {
        toast(deleteError.message);
        return;
      }
      if (selected.length) {
        let error;
        try {
          ({ error } = await state.client.from("pd_property_holders").insert(
            selected.map((member_user_id) => ({
              user_id: state.workspaceOwnerId,
              property_id: id,
              member_user_id,
            })),
          ));
        } catch {
          toast("Account-holder labels couldn't be saved right now. Check your connection and try again.");
          return;
        }
        if (error) {
          toast(error.message);
          try {
            await fetchAll();
            openPropertyDetails(id);
          } catch {
            return;
          }
          return;
        }
      }
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(id);
      toast("Account-holder labels saved");
    }

    async function toggleArchiveProperty() {
      const id = state.selectedPropertyId;
      const property = state.properties.find((item) => item.id === id);
      if (!property) return;
      const archived_at = property.archived_at ? null : todayIso();
      let error;
      try {
        ({ error } = await state.client.from("pd_properties")
          .update({ archived_at })
          .eq("id", id)
          .eq("user_id", state.workspaceOwnerId));
      } catch {
        toast("Property status couldn't be updated right now. Check your connection and try again.");
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

    return { savePropertyHolders, toggleArchiveProperty };
  }

  window.PropertyDeskPropertyManagement = { create };
})();
