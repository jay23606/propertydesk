/* Compose the payment and expense forms for workspace transaction entry. */
(() => {
  "use strict";

  function create(context) {
    const ledger = window.PropertyDeskLedgerEntryForms.create(context);
    return {
      updatePaymentGuidance: ledger.updatePaymentGuidance,
      openPayment: ledger.openPayment,
      openPropertyPayment: ledger.openPropertyPayment,
      openExpense: ledger.openExpense,
      attachLedgerEntryFormEvents: ledger.attachEvents,
    };
  }

  window.PropertyDeskLedgerEntryWorkflow = Object.freeze({ create });
})();
