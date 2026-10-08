/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({ toast, fetchAll, closeAccountDetails, repository }) {
    async function saveCloseAccount(account) {
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.close(account.id),
        toast,
        failureMessage:
          "Account couldn't be closed right now. Please try again.",
      });
      if (!saved) return;
      closeAccountDetails();
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: "Account closed",
      });
    }

    return { saveCloseAccount };
  }

  window.PropertyDeskAccountCloseMaintenance = Object.freeze({ create });
})();
