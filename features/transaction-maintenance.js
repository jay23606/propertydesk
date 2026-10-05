/* Void posted transactions while preserving their audit history. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    confirmAction = (message) => window.confirm(message),
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    timestamp = () => new Date().toISOString(),
  }) {
    async function voidTransaction(kind, id) {
      const table = kind === "income" ? "pd_payments" : "pd_expenses";
      const label = kind === "income" ? "income entry" : "expense";
      if (
        !confirmAction(
          `Void this ${label}? It will remain in the audit history but stop affecting balances and reports.`,
        )
      )
        return;
      const reason = promptAction(
        "Optional reason for the audit record:",
        "Entered in error",
      );
      if (reason === null) return;
      let result;
      try {
        result = await state.client
          .from(table)
          .update({
            status: "voided",
            voided_at: timestamp(),
            void_reason: reason.trim() || "Voided by owner",
          })
          .eq("id", id)
          .eq("status", "posted")
          .select("id")
          .maybeSingle();
      } catch {
        toast("Transaction couldn't be voided right now. Please try again.");
        return;
      }
      const { data, error } = result;
      if (error) {
        toast(error.message);
        return;
      }
      if (!data) {
        toast("This transaction was already voided or is no longer available.");
        return;
      }
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast("Transaction voided; original entry preserved");
    }

    return { voidTransaction };
  }

  window.PropertyDeskTransactionMaintenance = { create };
})();
