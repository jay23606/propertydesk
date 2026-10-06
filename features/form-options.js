/* Build shared property, payment, and expense select options. */
(() => {
  "use strict";

  function create({ $, state, esc, propertyAddress, prettyType }) {
    function fillSelect(id, options, placeholder) {
      const element = $(id);
      const optionHTML = options
        .map(
          (option) =>
            `<option value="${esc(option.value)}">${esc(option.label)}</option>`,
        )
        .join("");
      element.innerHTML = `<option value="">${esc(placeholder)}</option>${optionHTML}`;
    }

    function populateFormOptions() {
      const propertyOptions = state.properties.map((property) => ({
        value: property.id,
        label: `${property.name} — ${propertyAddress(property)}`,
      }));
      const paymentOptions = state.accounts
        .filter((account) => account.status === "active")
        .map((account) => ({
          value: account.id,
          label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
        }));
      const expenseAccountOptions = state.accounts.map((account) => ({
        value: account.id,
        label: `${account.name} — ${prettyType(account.account_type)}`,
      }));

      fillSelect("account-property", propertyOptions, "Choose a property");
      fillSelect("payment-account", paymentOptions, "Choose an account");
      fillSelect("expense-property", propertyOptions, "Choose a property");
      fillSelect("expense-account", expenseAccountOptions, "Property level");
    }

    return { fillSelect, populateFormOptions };
  }

  window.PropertyDeskFormOptions = Object.freeze({ create });
})();
