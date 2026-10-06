/* Shared currency formatting, text escaping, and domain labels. */
(() => {
  "use strict";

  const { accountTypes, paymentFrequencies, propertyKinds } =
    window.PropertyDeskDomainOptions;
  const { expenseCategories } = window.PropertyDeskTransactionOptions;
  const optionLabel = (options, value, fallback) => {
    const option = options.find((item) => item.value === value);
    return option?.displayLabel || option?.label || fallback;
  };

  const money = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const esc = (value) => {
    const htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) => htmlEntities[character],
    );
  };
  const prettyType = (type) =>
    optionLabel(accountTypes, type, null) || type || "Account";
  const prettyKind = (kind) =>
    optionLabel(propertyKinds, kind, null) || kind || "Property";
  const paymentFrequencyLabel = (frequency) =>
    optionLabel(paymentFrequencies, frequency, "Monthly");
  const expenseCategoryLabel = (category) =>
    optionLabel(expenseCategories, category, null) ||
    String(category || "other").replaceAll("_", " ");

  window.PropertyDeskDisplayUtils = Object.freeze({
    money,
    esc,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  });
})();
