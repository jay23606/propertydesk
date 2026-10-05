/* PropertyDesk security-deposit retention and reversal workflow. */
(() => {
  "use strict";

  function create({
    state,
    moneyInput,
    todayIso,
    toast,
    fetchAll,
    openAccountDetails,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
  }) {
    async function recordDepositAdjustment(accountId, type) {
      const account = state.accounts.find((row) => row.id === accountId);
      if (!account || account.account_type !== "rental") return;
      const action =
        type === "retained"
          ? "retained from the deposit"
          : "restored to the held balance";
      const amount = moneyInput(promptAction(`Amount ${action}?`, "0.00"));
      if (amount <= 0) {
        toast("Enter an amount greater than zero");
        return;
      }
      const reason = promptAction("Add a reason for the deposit ledger:");
      if (reason === null) return;
      if (!reason.trim()) {
        toast("Enter a reason so this adjustment can be audited");
        return;
      }
      let error;
      try {
        ({ error } = await state.client.from("pd_deposit_entries").insert({
          user_id: state.workspaceOwnerId,
          account_id: accountId,
          entry_type: type,
          amount,
          movement_date: todayIso(),
          reason: reason.trim(),
        }));
      } catch {
        toast("Deposit adjustment failed. Check your connection and try again.");
        return;
      }
      if (error) {
        toast(`Deposit adjustment failed: ${error.message}`);
        return;
      }
      try {
        await fetchAll();
        await openAccountDetails(accountId);
      } catch {
        return;
      }
      toast(
        type === "retained"
          ? "Deposit retention recorded"
          : "Deposit retention reversed",
      );
    }

    return { recordDepositAdjustment };
  }

  window.PropertyDeskDepositMaintenance = { create };
})();
