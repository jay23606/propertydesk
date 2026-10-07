/* Connect transaction history filtering, rendering, and summary totals. */
(() => {
  "use strict";

  function create(context) {
    const transactionViews =
      window.PropertyDeskTransactionViews.create(context);

    return {
      renderPayments: transactionViews.renderPayments,
      attachTransactionViewEvents: transactionViews.attachEvents,
    };
  }

  window.PropertyDeskTransactionHistoryWorkflow = Object.freeze({ create });
})();
