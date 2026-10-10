/* Bind top-level create buttons to their property and ledger forms. */
(() => {
  "use strict";

  function createActions({
    $,
    getProperties,
    getAccounts,
    toast,
    resetPropertyForm,
    openModal,
    openAccountForProperty,
    openPayment,
    openExpense,
    navigate,
    documentRef,
  }) {
    function attachCreateActionEvents() {
      documentRef
        .querySelectorAll('[data-open="property-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            resetPropertyForm();
            openModal("property-modal");
          });
        });
      documentRef
        .querySelectorAll('[data-open="account-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            if (!getProperties().length) {
              toast("Add a property before creating an account");
              navigate("properties");
              return;
            }
            openAccountForProperty();
          });
        });

      const openPayments = () => {
        if (!getAccounts().length) {
          toast("Add an account before recording a payment");
          navigate("properties");
          return;
        }
        openPayment();
      };
      documentRef
        .querySelectorAll('[data-open="payment-modal"]')
        .forEach((button) => {
          button.addEventListener("click", openPayments);
        });
      $("quick-payment").addEventListener("click", openPayments);
      documentRef
        .querySelectorAll('[data-open="expense-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            if (!getProperties().length) {
              toast("Add a property before recording an expense");
              navigate("properties");
              return;
            }
            openExpense();
          });
        });
    }

    return Object.freeze({ attachCreateActionEvents });
  }

  window.PropertyDeskCreateActions = Object.freeze({ create: createActions });
})();
