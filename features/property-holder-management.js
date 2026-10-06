/* Save account-holder labels for a property. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    repository = window.PropertyDeskPropertyHolderRepository.create({
      getClient: () => state.client,
    }),
  }) {
    async function savePropertyHolders(selectedMemberIds = []) {
      const id = state.selectedPropertyId;
      if (!id) return;

      let deleteError;
      try {
        ({ error: deleteError } = await repository.clearPropertyHolders(
          state.workspaceOwnerId,
          id,
        ));
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
      if (selectedMemberIds.length) {
        let error;
        try {
          ({ error } = await repository.addPropertyHolders(
            state.workspaceOwnerId,
            id,
            selectedMemberIds,
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
