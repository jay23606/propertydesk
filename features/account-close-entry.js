/* Confirm account closure before handing the action to persistence. */
(() => {
  "use strict";

  function create({
    saveCloseAccount,
    confirmAction,
  }) {
    function closeAccount(account) {
      if (
        !confirmAction(
          `Close “${account.name}”? Its payment history will remain in your records.`,
        )
      )
        return false;
      return saveCloseAccount(account);
    }

    return Object.freeze({ closeAccount });
  }

  window.PropertyDeskAccountCloseEntry = Object.freeze({ create });
})();
