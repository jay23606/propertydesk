/* Confirm account closure before handing the action to persistence. */
(() => {
  "use strict";

  function create({
    saveCloseAccount,
    confirmAction = (message) => window.confirm(message),
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

    return { closeAccount };
  }

  window.PropertyDeskAccountCloseEntry = Object.freeze({ create });
})();
