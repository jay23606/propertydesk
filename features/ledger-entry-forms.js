/* Compose the separate receipt and property-expense entry workflows. */
(() => {
  "use strict";

  function createLedgerEntryForms(context) {
    const payments = window.PropertyDeskPaymentEntryForm.create(context);
    const expenses = window.PropertyDeskExpenseEntryForm.create(context);

    function attachEvents() {
      payments.attachEvents();
      expenses.attachEvents();
    }

    return {
      ...payments,
      ...expenses,
      attachEvents,
    };
  }

  window.PropertyDeskLedgerEntryForms = Object.freeze({ create: createLedgerEntryForms });
})();
