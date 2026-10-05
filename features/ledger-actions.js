/* PropertyDesk account lifecycle and ledger adjustment workflows. */
(() => {
  "use strict";

  function create({
    $,
    state,
    moneyInput,
    todayIso,
    toast,
    fetchAll,
    closeModal,
    openAccountDetails,
    confirmAction = (message) => window.confirm(message),
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
      const { error } = await state.client.from("pd_deposit_entries").insert({
        user_id: state.workspaceOwnerId,
        account_id: accountId,
        entry_type: type,
        amount,
        movement_date: todayIso(),
        reason: reason.trim(),
      });
      if (error) {
        toast(`Deposit adjustment failed: ${error.message}`);
        return;
      }
      await fetchAll();
      await openAccountDetails(accountId);
      toast(
        type === "retained"
          ? "Deposit retention recorded"
          : "Deposit retention reversed",
      );
    }

    async function deleteAccount(account) {
      if (
        !confirmAction(
          `Close “${account.name}”? Its payment history will remain in your records.`,
        )
      )
        return;
      const { error } = await state.client
        .from("pd_accounts")
        .update({ status: "closed" })
        .eq("id", account.id);
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("detail-modal"));
      await fetchAll();
      toast("Account closed");
    }

    return { recordDepositAdjustment, deleteAccount };
  }

  window.PropertyDeskLedgerActions = { create };
})();
