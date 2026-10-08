/* Property-card and quick-payment actions on the Overview page. */
(() => {
  "use strict";

  function createOverviewEvents({
    $,
    openPropertyDetails,
    openPropertyPayment,
  }) {
    function attachEvents() {
      $("overview-properties").addEventListener("click", (event) => {
        const payment = event.target.closest("[data-property-payment]");
        if (payment) {
          event.preventDefault();
          event.stopPropagation();
          openPropertyPayment(payment.dataset.propertyPayment);
          return;
        }
        const card = event.target.closest("[data-property-card]");
        if (card) openPropertyDetails(card.dataset.propertyCard);
      });
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskOverviewEvents = Object.freeze({
    create: createOverviewEvents,
  });
})();
