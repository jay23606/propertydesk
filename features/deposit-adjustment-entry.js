/* Collect deposit-adjustment inputs before handing them to persistence. */
(() => {
  "use strict";

  function create({
    state,
    moneyInput,
    toast,
    saveDepositAdjustment,
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    validateAdjustment,
  }) {
    async function recordDepositAdjustment(accountId, type) {
      const account = state.accounts.find((row) => row.id === accountId);
      if (!account || account.account_type !== "rental") return false;
      const action =
        type === "retained"
          ? "retained from the deposit"
          : "restored to the held balance";
      const enteredAmount = promptAction(`Amount ${action}?`, "0.00");
      if (enteredAmount === null) return false;
      const amount = moneyInput(enteredAmount);
      const validation = validateAdjustment({ account, amount });
      if (validation.status === "invalid-amount") {
        toast("Enter an amount greater than zero");
        return false;
      }
      if (validation.status !== "ready") return false;
      const reason = promptAction("Add a reason for the deposit ledger:");
      if (reason === null) return false;
      return saveDepositAdjustment(accountId, type, amount, reason);
    }

    return Object.freeze({ recordDepositAdjustment });
  }

  window.PropertyDeskDepositAdjustmentEntry = Object.freeze({ create });
})();
