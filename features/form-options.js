/* Build shared property, payment, and expense select options. */
(() => {
  "use strict";

  function create({
    $,
    getProperties,
    getAccounts,
    esc,
    propertyAddress,
    prettyType,
    modules,
  }) {
    const { accountTypes, paymentFrequencies, propertyKinds } =
      modules.domainOptions;
    const {
      incomeCategories,
      paymentMethods,
      expensePaymentMethods,
      expenseCategories,
    } = modules.transactionOptions;

    function populateSelectOptions() {
      for (const [id, options] of [
        ["account-type", accountTypes],
        ["account-frequency", paymentFrequencies],
        ["property-kind", propertyKinds],
        ["income-category", incomeCategories.rental],
        ["payment-method", paymentMethods],
        ["expense-category", expenseCategories],
        [
          "expense-method",
          expensePaymentMethods.filter(
            (option) => option.formVisible !== false,
          ),
        ],
      ])
        $(id).innerHTML = options
          .map(
            ({ value, label }) =>
              `<option value="${esc(value)}">${esc(label)}</option>`,
          )
          .join("");
    }

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
      const propertyOptions = getProperties().map((property) => ({
        value: property.id,
        label: `${property.name} — ${propertyAddress(property)}`,
      }));
      const paymentOptions = getAccounts()
        .filter((account) => account.status === "active")
        .map((account) => ({
          value: account.id,
          label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
        }));
      const expenseAccountOptions = getAccounts().map((account) => ({
        value: account.id,
        label: `${account.name} — ${prettyType(account.account_type)}`,
      }));

      fillSelect("account-property", propertyOptions, "Choose a property");
      fillSelect("payment-account", paymentOptions, "Choose an account");
      fillSelect("expense-property", propertyOptions, "Choose a property");
      fillSelect("expense-account", expenseAccountOptions, "Property level");
    }

    populateSelectOptions();
    return Object.freeze({ fillSelect, populateFormOptions });
  }

  window.PropertyDeskFormOptions = Object.freeze({ create });
})();
