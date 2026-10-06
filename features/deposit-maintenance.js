/* PropertyDesk security-deposit retention and reversal workflow. */
(() => {
  "use strict";

  function create({
    state,
    todayIso,
    toast,
    fetchAll,
    prepareAdjustment = window.PropertyDeskDepositAdjustmentModel.prepare,
    repository = window.PropertyDeskDepositRepository,
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
      if (prepared.status === "cancelled") return false;
      if (prepared.status === "missing-reason") {
        toast("Enter a reason so this adjustment can be audited");
        return false;
      }
      if (prepared.status !== "ready") return false;
      let error;
      try {
        ({ error } = await repository.insert(state.client, prepared.payload));
      } catch {
        toast(
          "Deposit adjustment failed. Check your connection and try again.",
        );
        return false;
      }
      if (error) {
        toast(`Deposit adjustment failed: ${error.message}`);
        return false;
      }
      try {
        await fetchAll();
      } catch {
        return false;
      }
      toast(
        type === "retained"
          ? "Deposit retention recorded"
          : "Deposit retention reversed",
      );
      return true;
    }

    return { saveDepositAdjustment };
  }

  window.PropertyDeskDepositMaintenance = Object.freeze({ create });
})();
