/* Save account-holder labels for a property. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, openPropertyDetails, repository }) {
    async function refreshUncertainLabels(
      id,
      expectedMemberIds,
      refreshFailureMessage,
    ) {
      return window.PropertyDeskRepositoryWriteFeedback.reconcileWorkspaceChange(
        {
          fetchAll,
          isConfirmed: () => {
            const actualMemberIds = (state.propertyHolders || [])
              .filter(
                (row) =>
                  row.user_id === state.workspaceOwnerId &&
                  row.property_id === id,
              )
              .map((row) => row.member_user_id)
              .sort();
            const expected = expectedMemberIds.slice().sort();
            return (
              actualMemberIds.length === expected.length &&
              actualMemberIds.every(
                (memberId, index) => memberId === expected[index],
              )
            );
          },
          afterRefresh: () => openPropertyDetails(id),
          toast,
          refreshFailureMessage,
          retryMessage:
            "Current account-holder labels were refreshed. Check them before retrying.",
          onConfirmed: () => toast("Account-holder labels saved"),
        },
      );
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
        return refreshUncertainLabels(
          id,
          selectedMemberIds,
          "Account-holder label update status couldn't be confirmed, and the workspace could not refresh. Reload to verify the current labels.",
        );
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
          return refreshUncertainLabels(
            id,
            selectedMemberIds,
            "Account-holder labels may be partially saved, and the workspace could not refresh. Reload to verify the current labels.",
          );
        }
        if (error) {
          toast(error.message);
          await refreshUncertainLabels(
            id,
            selectedMemberIds,
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
