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
      let error;
      try {
        ({ error } = await repository.close(state.client, account.id));
      } catch {
        toast("Account couldn't be closed right now. Please try again.");
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
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
