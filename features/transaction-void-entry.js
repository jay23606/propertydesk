/* Confirm a transaction void and collect its optional audit reason. */
(() => {
  "use strict";

  function create({
    toast,
    saveVoidTransaction,
    confirmAction = (message) => window.confirm(message),
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    resolveVoidTarget,
  }) {
    async function voidTransaction(kind, id) {
      const target = resolveVoidTarget(kind);
      if (!target) {
        toast("This transaction type can't be voided");
        return false;
      }
      if (
        !confirmAction(
          `Void this ${target.label}? It will remain in the audit history but stop affecting balances and reports.`,
        )
      )
        return false;
      const reason = promptAction(
        "Optional reason for the audit record:",
        "Entered in error",
      );
      if (reason === null) return false;
      return saveVoidTransaction(kind, id, reason);
    }

    return Object.freeze({ voidTransaction });
  }

  window.PropertyDeskTransactionVoidEntry = Object.freeze({ create });
})();
