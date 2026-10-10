/* Map supported transaction kinds and prepare their audit-preserving void data. */
(() => {
  "use strict";

  function resolveVoidTarget(kind) {
    if (kind === "income")
      return {
        label: "income entry",
        collection: "payments",
      };
    if (kind === "expense")
      return {
        label: "expense",
        collection: "expenses",
      };
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
