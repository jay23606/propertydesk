/* PropertyDesk account closure and history-preservation workflow. */
(() => {
  "use strict";

  function create({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
    confirmAction = (message) => window.confirm(message),
  }) {
    async function closeAccount(account) {
      if (
        !confirmAction(
          `Close “${account.name}”? Its payment history will remain in your records.`,
        )
      )
        return;
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
      closeModal($("detail-modal"));
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast("Account closed");
    }

    return { closeAccount };
  }

  window.PropertyDeskAccountMaintenance = { create };
})();
