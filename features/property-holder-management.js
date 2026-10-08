/* Save account-holder labels for a property. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, openPropertyDetails, repository }) {
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
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => openPropertyDetails(id),
            });
          } catch {
            return;
          }
          return;
        }
      }
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: () => openPropertyDetails(id),
        toast,
        successMessage: "Account-holder labels saved",
        refreshFailureMessage:
          "Account-holder labels were saved, but the workspace could not refresh. Reload to verify them.",
      });
    }

    return Object.freeze({ savePropertyHolders });
  }

  window.PropertyDeskPropertyHolderManagement = Object.freeze({ create });
})();
