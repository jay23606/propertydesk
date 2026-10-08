/* Route property portfolio actions to their owning workflows. */
(() => {
  "use strict";

  function createPropertyViewEvents({
    $,
    openPayment,
    editPropertyQuickNote,
    openPropertyDetails,
    openAccountForProperty,
  }) {
    function attachEvents() {
      $("properties-table").addEventListener("click", (event) => {
        const payment = event.target.closest("[data-account-payment]");
        if (payment) {
          event.preventDefault();
          event.stopPropagation();
          openPayment(payment.dataset.accountPayment);
          return;
        }
        const note = event.target.closest("[data-property-note]");
        if (note) {
          event.preventDefault();
          event.stopPropagation();
          editPropertyQuickNote(note.dataset.propertyNote);
          return;
        }
        const property = event.target.closest("[data-property-open]");
        if (property) {
          openPropertyDetails(property.dataset.propertyOpen);
          return;
        }
        const addAccount = event.target.closest("[data-property-account]");
        if (addAccount) {
          openAccountForProperty(addAccount.dataset.propertyAccount);
        }
      });
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskPropertyViewEvents = Object.freeze({
    create: createPropertyViewEvents,
  });
})();
