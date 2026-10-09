/* Start a payment for a property with its active account selection. */
(() => {
  "use strict";

  function create({ getAccounts, toast, openPayment }) {
    function openPropertyPayment(propertyId) {
      const accounts = getAccounts().filter(
        (account) =>
          account.property_id === propertyId && account.status === "active",
      );
      if (!accounts.length) {
        toast("Add an active account before recording a payment");
        return;
      }
      openPayment(accounts.length === 1 ? accounts[0].id : null, propertyId);
    }

    return Object.freeze({ openPropertyPayment });
  }

  window.PropertyDeskPropertyPaymentAction = Object.freeze({ create });
})();
