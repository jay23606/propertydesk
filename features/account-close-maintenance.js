/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, closeAccountDetails, repository }) {
    async function saveCloseAccount(account) {
      let reconciled = false;
      const saved =
        await window.PropertyDeskRepositoryWriteFeedback.saveWorkspaceRecord({
          operation: () => repository.close(account.id),
          state,
          collection: "accounts",
          payload: { status: "closed" },
          recordId: account.id,
          fetchAll,
          toast,
          failureMessage:
            "Account close result couldn't be confirmed. Reload the account before trying again.",
          refreshFailureMessage:
            "Account close result couldn't be confirmed, and the workspace could not refresh. Reload the account before trying again.",
          retryMessage:
            "Accounts were refreshed. Check the account status before trying again.",
          onReconciled: () => {
            reconciled = true;
            closeAccountDetails();
            toast("Account closed");
          },
        });
      if (!saved) return;
      if (reconciled) return true;
      closeAccountDetails();
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: "Account closed",
        refreshFailureMessage:
          "Account was closed, but the workspace could not refresh. Reload to verify its status.",
      });
    }

    return Object.freeze({ saveCloseAccount });
  }

  window.PropertyDeskAccountCloseMaintenance = Object.freeze({ create });
})();
