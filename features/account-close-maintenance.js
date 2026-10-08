/* Close an account while preserving its payment history. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, closeAccountDetails, repository }) {
    function saveCloseAccount(account) {
      return window.PropertyDeskRepositoryWriteFeedback.saveAndRefreshWorkspaceRecord(
        {
          operation: () => repository.close(account.id),
          state,
          collection: "accounts",
          payload: { status: "closed" },
          recordId: account.id,
          fetchAll,
          toast,
          failureMessage:
            "Account close result couldn't be confirmed. Reload the account before trying again.",
          refreshFailureMessage:
            "Account close result couldn't be confirmed, and the workspace could not refresh. Reload the account before trying again.",
          retryMessage:
            "Accounts were refreshed. Check the account status before trying again.",
          onSaved: closeAccountDetails,
          successMessage: "Account closed",
          savedRefreshFailureMessage:
            "Account was closed, but the workspace could not refresh. Reload to verify its status.",
          onReconciled: () => {
            closeAccountDetails();
            toast("Account closed");
          },
        },
      );
    }

    return Object.freeze({ saveCloseAccount });
  }

  window.PropertyDeskAccountCloseMaintenance = Object.freeze({ create });
})();
