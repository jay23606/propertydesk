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

  function matchingEntryCount(entries, payload) {
    return entries.filter(
      (entry) =>
        entry.user_id === payload.user_id &&
        entry.account_id === payload.account_id &&
        entry.entry_type === payload.entry_type &&
        Number(entry.amount) === Number(payload.amount) &&
        entry.movement_date === payload.movement_date &&
        entry.reason === payload.reason,
    ).length;
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
      const previousCount = matchingEntryCount(
        state.depositEntries || [],
        prepared.payload,
      );
      let reconciled = false;
      const saved = await window.PropertyDeskRepositoryWriteFeedback.run({
        operation: () => repository.insert(prepared.payload),
        toast,
        failureMessage:
          "Deposit adjustment result couldn't be confirmed. Reload the deposit ledger before recording it again.",
        errorMessage: (error) => `Deposit adjustment failed: ${error.message}`,
        onUnconfirmed: async () => {
          let entryWasAdded = false;
          const refreshed =
            await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
              fetchAll,
              afterRefresh: () => {
                entryWasAdded =
                  matchingEntryCount(
                    state.depositEntries || [],
                    prepared.payload,
                  ) > previousCount;
              },
              toast,
              refreshFailureMessage:
                "Deposit adjustment result couldn't be confirmed, and the workspace could not refresh. Reload the deposit ledger before recording it again.",
            });
          if (!refreshed) return false;
          if (!entryWasAdded) {
            toast(
              "Deposit ledger was refreshed. Check it before recording the adjustment again.",
            );
            return false;
          }
          reconciled = true;
          toast(
            type === "retained"
              ? "Deposit retention recorded"
              : "Deposit retention reversed",
          );
          return true;
        },
      });
      if (!saved) return false;
      if (reconciled) return true;
      return window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage:
          type === "retained"
            ? "Deposit retention recorded"
            : "Deposit retention reversed",
        refreshFailureMessage:
          "Deposit adjustment was saved, but the workspace could not refresh. Reload before recording another adjustment.",
      });
    }

    return Object.freeze({ saveDepositAdjustment });
  }

  window.PropertyDeskDepositMaintenance = Object.freeze({ create });
})();
