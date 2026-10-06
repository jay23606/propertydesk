/* Persist account changes and preserve closed accounts for history. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    closeAccountDetails,
    repository = window.PropertyDeskAccountRepository,
  }) {
    async function saveAccount(payload, accountId) {
      let error;
      try {
        ({ error } = await repository.save(state.client, payload, accountId));
      } catch {
        toast(
          "Account couldn't be saved right now. Check your connection and try again.",
        );
        return false;
      }
      if (error) {
        toast(error.message);
        return false;
      }
      return true;
    }

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

    return { saveAccount, saveCloseAccount };
  }

  window.PropertyDeskAccountMaintenance = Object.freeze({ create });
})();
