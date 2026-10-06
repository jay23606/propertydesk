/* PropertyDesk account closure and history-preservation workflow. */
(() => {
  "use strict";

  function create({ state, toast, fetchAll, closeAccountDetails }) {
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

    return { saveCloseAccount };
  }

  window.PropertyDeskAccountMaintenance = Object.freeze({ create });
})();
