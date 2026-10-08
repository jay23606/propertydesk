/* Save account-holder labels for a property. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, openPropertyDetails, repository }) {
    async function refreshUncertainLabels(id, refreshFailureMessage) {
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: () => openPropertyDetails(id),
        toast,
        refreshFailureMessage,
      });
    }

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
        await refreshUncertainLabels(
          id,
          "Account-holder label update status couldn't be confirmed, and the workspace could not refresh. Reload to verify the current labels.",
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
          await refreshUncertainLabels(
            id,
            "Account-holder labels may be partially saved, and the workspace could not refresh. Reload to verify the current labels.",
          );
          return;
        }
        if (error) {
          toast(error.message);
          await refreshUncertainLabels(
            id,
            "Account-holder labels could not be fully saved, and the workspace could not refresh. Reload to verify the current labels.",
          );
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
