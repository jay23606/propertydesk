/* Bind top-level create buttons to their property and ledger forms. */
(() => {
  "use strict";

  function createActions(context) {
    const {
      $,
      state,
      toast,
      resetPropertyForm,
      resetAccountForm,
      populateFormOptions,
      openModal,
      openPayment,
      openExpense,
      documentRef,
    } = context;

    function attachCreateActions(navigate) {
      const browserDocument = documentRef || document;
      browserDocument
        .querySelectorAll('[data-open="property-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            resetPropertyForm();
            openModal("property-modal");
          });
        });
      browserDocument
        .querySelectorAll('[data-open="account-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            if (!state.properties.length) {
              toast("Add a property before creating an account");
              navigate("properties");
              return;
            }
            resetAccountForm();
            populateFormOptions();
            openModal("account-modal");
          });
        });

      const openPayments = () => {
        if (!state.accounts.length) {
          toast("Add an account before recording a payment");
          navigate("properties");
          return;
        }
        openPayment();
      };
      browserDocument
        .querySelectorAll('[data-open="payment-modal"]')
        .forEach((button) => {
          button.addEventListener("click", openPayments);
        });
      $("quick-payment").addEventListener("click", openPayments);
      browserDocument
        .querySelectorAll('[data-open="expense-modal"]')
        .forEach((button) => {
          button.addEventListener("click", () => {
            if (!state.properties.length) {
              toast("Add a property before recording an expense");
              navigate("properties");
              return;
            }
            openExpense();
          });
        });
    }

    return { attachEvents: attachCreateActions };
  }

  window.PropertyDeskCreateActions = Object.freeze({ create: createActions });
})();
