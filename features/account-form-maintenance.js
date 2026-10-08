/* Persist account form changes without owning detail-page actions. */
(() => {
  "use strict";

  function create({ toast, repository }) {
    function saveAccount(payload, accountId) {
      return window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.save(payload, accountId),
        toast,
        failureMessage:
          "Account save result couldn't be confirmed. Reload Properties before trying again.",
      });
    }

    return Object.freeze({ saveAccount });
  }

  window.PropertyDeskAccountFormMaintenance = Object.freeze({ create });
})();
