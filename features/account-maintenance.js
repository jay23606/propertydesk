/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    repository = window.PropertyDeskAccountRepository,
  }) {
    function saveAccount(payload, accountId) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.save(state.client, payload, accountId),
        toast,
        failureMessage:
          "Account couldn't be saved right now. Check your connection and try again.",
      });
    }

    return { saveAccount };
  }

  window.PropertyDeskAccountMaintenance = Object.freeze({ create });
})();
