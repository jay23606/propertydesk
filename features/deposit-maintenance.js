/* PropertyDesk security-deposit retention and reversal workflow. */
(() => {
  "use strict";

  function adjustmentIsReady(prepared, toast) {
    if (prepared.status === "missing-reason") {
      toast("Enter a reason so this adjustment can be audited");
      return false;
    }
    return prepared.status === "ready";
  }

  function create({
    state,
    todayIso,
    toast,
    fetchAll,
    prepareAdjustment,
    repository,
  }) {
    async function saveDepositAdjustment(accountId, type, amount, reason) {
      const account = state.accounts.find((row) => row.id === accountId);
      if (!account || account.account_type !== "rental") return false;
      const prepared = prepareAdjustment({
        account,
        userId: state.workspaceOwnerId,
        accountId,
        type,
        amount,
        reason,
        movementDate: reason.trim() ? todayIso() : null,
      });
      if (!adjustmentIsReady(prepared, toast)) return false;
      const message =
        type === "retained"
          ? "Deposit retention recorded"
          : "Deposit retention reversed";
      return window.PropertyDeskRepositoryWriteFeedback.saveAndRefreshWorkspaceRecord(
        {
          operation: () => repository.insert(prepared.payload),
          state,
          collection: "depositEntries",
          payload: prepared.payload,
          fetchAll,
          toast,
          failureMessage:
            "Deposit adjustment result couldn't be confirmed. Reload the deposit ledger before recording it again.",
          errorMessage: (error) =>
            `Deposit adjustment failed: ${error.message}`,
          refreshFailureMessage:
            "Deposit adjustment result couldn't be confirmed, and the workspace could not refresh. Reload the deposit ledger before recording it again.",
          retryMessage:
            "Deposit ledger was refreshed. Check it before recording the adjustment again.",
          onReconciled: () => {
            toast(message);
          },
          successMessage: message,
          savedRefreshFailureMessage:
            "Deposit adjustment was saved, but the workspace could not refresh. Reload before recording another adjustment.",
        },
      );
    }

    return Object.freeze({ saveDepositAdjustment });
  }

  window.PropertyDeskDepositMaintenance = Object.freeze({ create });
})();
