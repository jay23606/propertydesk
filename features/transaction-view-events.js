/* Route transaction-table correction and void actions to maintenance workflows. */
(() => {
  "use strict";

  function createTransactionViewEvents({
    documentRef = document,
    correctTransaction,
    voidTransaction,
  }) {
    function attachEvents() {
      documentRef.addEventListener("click", (event) => {
        const correction = event.target.closest("[data-correct-transaction]");
        if (correction) {
          correctTransaction(correction.dataset.kind, correction.dataset.id);
          return;
        }
        const voidButton = event.target.closest("[data-void-transaction]");
        if (voidButton) {
          voidTransaction(voidButton.dataset.kind, voidButton.dataset.id);
        }
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskTransactionViewEvents = Object.freeze({
    create: createTransactionViewEvents,
  });
})();
