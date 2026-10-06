/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    closeAccountDetails,
    repository = window.PropertyDeskAccountRepository,
  }) {
    async function saveCloseAccount(account) {
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.close(state.client, account.id),
        toast,
        failureMessage:
          "Account couldn't be closed right now. Please try again.",
      });
      if (!saved) return;
      closeAccountDetails();
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast("Account closed");
    }

    return { saveCloseAccount };
  }

  window.PropertyDeskAccountCloseMaintenance = Object.freeze({ create });
})();
