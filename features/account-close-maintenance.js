/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, closeAccountDetails, repository }) {
    async function saveCloseAccount(account) {
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.close(account.id),
        toast,
        failureMessage:
          "Account close result couldn't be confirmed. Reload the account before trying again.",
        onUnconfirmed: async () => {
          let isClosed = false;
          const refreshed =
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => {
                isClosed = state.accounts.some(
                  (row) => row.id === account.id && row.status === "closed",
                );
              },
              toast,
              refreshFailureMessage:
                "Account close result couldn't be confirmed, and the workspace could not refresh. Reload the account before trying again.",
            });
          if (!refreshed) return false;
          if (!isClosed) {
            toast(
              "Accounts were refreshed. Check the account status before trying again.",
            );
            return false;
          }
          reconciled = true;
          closeAccountDetails();
          toast("Account closed");
          return true;
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
