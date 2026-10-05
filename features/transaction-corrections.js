/* Audited correction writes for posted payments and expenses. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, closeModal }) {
    async function saveCorrection(kind, correction) {
      const pending = state.pendingCorrection;
      if (!pending || pending.kind !== kind) {
        toast("This correction is no longer available.");
        return false;
      }
      let error;
      try {
        ({ error } = await state.client.rpc("pd_correct_transaction", {
          p_kind: kind,
          p_transaction_id: pending.id,
          p_correction: correction,
          p_reason: pending.reason,
        }));
      } catch {
        toast(
          "Correction failed; original entry is unchanged. Check your connection and try again.",
        );
        return false;
      }
      if (error) {
        toast(
          `Correction failed; original entry is unchanged. ${error.message}`,
        );
        return false;
      }
      closeModal($(kind === "payment" ? "payment-modal" : "expense-modal"));
      try {
        await fetchAll();
      } catch {
        return false;
      }
      toast(
        `${kind === "payment" ? "Payment" : "Expense"} corrected; original kept in history`,
      );
      return true;
    }

    return { saveCorrection };
  }

  window.PropertyDeskTransactionCorrections = Object.freeze({ create });
})();
