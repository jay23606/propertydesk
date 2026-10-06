/* PropertyDesk security-deposit retention and reversal workflow. */
(() => {
  "use strict";

  function create({
    state,
    moneyInput,
    todayIso,
    toast,
    fetchAll,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    validateAdjustment = window.PropertyDeskDepositAdjustmentModel.validate,
    prepareAdjustment = window.PropertyDeskDepositAdjustmentModel.prepare,
  }) {
    async function recordDepositAdjustment(accountId, type) {
      const account = state.accounts.find((row) => row.id === accountId);
      if (!account || account.account_type !== "rental") return false;
      const action =
        type === "retained"
          ? "retained from the deposit"
          : "restored to the held balance";
      const amount = moneyInput(promptAction(`Amount ${action}?`, "0.00"));
      const validation = validateAdjustment({ account, amount });
      if (validation.status === "invalid-amount") {
        toast("Enter an amount greater than zero");
        return false;
      }
      if (validation.status !== "ready") return false;
      const reason = promptAction("Add a reason for the deposit ledger:");
      if (reason === null) return false;
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
        ({ error } = await state.client
          .from("pd_deposit_entries")
          .insert(prepared.payload));
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

    return { recordDepositAdjustment };
  }

  window.PropertyDeskDepositMaintenance = Object.freeze({ create });
})();
