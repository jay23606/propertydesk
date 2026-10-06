/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({
    state,
    toast,
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

    return { saveAccount };
  }

  window.PropertyDeskAccountMaintenance = Object.freeze({ create });
})();
