/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({ toast, fetchAll, closeAccountDetails, repository }) {
    async function saveCloseAccount(account) {
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.close(account.id),
        toast,
        failureMessage:
          "Account close result couldn't be confirmed. Reload the account before trying again.",
      });
      if (!saved) return;
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
