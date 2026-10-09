/* Route transaction-table correction and void actions to maintenance workflows. */
(() => {
  "use strict";

  function createTransactionMaintenanceEvents({
    documentRef,
    correctTransaction,
    voidTransaction,
  }) {
    function attachTransactionActionEvents() {
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

    return Object.freeze({ attachTransactionActionEvents });
  }

  window.PropertyDeskTransactionMaintenanceEvents = Object.freeze({
    create: createTransactionMaintenanceEvents,
  });
})();
