/* Persist account changes and preserve closed accounts for history. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, closeAccountDetails }) {
    async function saveAccount(payload, accountId) {
      let error;
      try {
        const query = accountId
          ? state.client.from("pd_accounts").update(payload).eq("id", accountId)
          : state.client.from("pd_accounts").insert(payload);
        ({ error } = await query);
      } catch {
        toast(
          "Account couldn't be saved right now. Check your connection and try again.",
        );
        return false;
      }
      if (error) {
        toast(error.message);
        return false;
      }
      return true;
    }

    async function saveCloseAccount(account) {
      let error;
      try {
        ({ error } = await state.client
          .from("pd_accounts")
          .update({ status: "closed" })
          .eq("id", account.id));
      } catch {
        toast("Account couldn't be closed right now. Please try again.");
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      closeAccountDetails();
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast("Account closed");
    }

    return { saveAccount, saveCloseAccount };
  }

  window.PropertyDeskAccountMaintenance = Object.freeze({ create });
})();
