/* Save account-holder labels for a property. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    documentRef = document,
  }) {
    async function savePropertyHolders() {
      const id = state.selectedPropertyId;
      const selected = [
        ...documentRef.querySelectorAll("[data-holder-choice]:checked"),
      ].map((input) => input.value);
      if (!id) return;

      let deleteError;
      try {
        ({ error: deleteError } = await state.client
          .from("pd_property_holders")
          .delete()
          .eq("user_id", state.workspaceOwnerId)
          .eq("property_id", id));
      } catch {
        toast(
          "Account-holder labels couldn't be saved right now. Check your connection and try again.",
        );
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
          toast(
            "Account-holder labels couldn't be saved right now. Check your connection and try again.",
          );
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

    return { savePropertyHolders };
  }

  window.PropertyDeskPropertyHolderManagement = Object.freeze({ create });
})();
