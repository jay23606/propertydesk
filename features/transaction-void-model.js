/* Map supported transaction kinds and prepare their audit-preserving void data. */
(() => {
  "use strict";

  function resolveVoidTarget(kind) {
    if (kind === "income")
      return { table: "pd_payments", label: "income entry" };
    if (kind === "expense") return { table: "pd_expenses", label: "expense" };
    return null;
  }

  function buildVoidPayload(reason, timestamp) {
    return {
      status: "voided",
      voided_at: timestamp,
      void_reason: reason.trim() || "Voided by owner",
    };
  }

  window.PropertyDeskTransactionVoidModel = Object.freeze({
    resolveVoidTarget,
    buildVoidPayload,
  });
})();
