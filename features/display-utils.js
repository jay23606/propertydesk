/* Shared currency formatting, text escaping, and domain labels. */
(() => {
  "use strict";

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
    ({
      rental: "Rental",
      land_contract: "Land contract",
      note: "Private note",
    })[type] ||
    type ||
    "Account";
  const prettyKind = (kind) =>
    ({
      residential: "Residential",
      land: "Land",
      commercial: "Commercial",
      other: "Other",
    })[kind] ||
    kind ||
    "Property";
  const paymentFrequencyLabel = (frequency) => {
    const labels = {
      monthly: "Monthly",
      weekly: "Weekly",
      biweekly: "Every 2 weeks",
      quarterly: "Quarterly",
      annual: "Annually",
    };
    return labels[frequency] || "Monthly";
  };
  const expenseCategoryLabel = (category) =>
    category === "deposit_refund"
      ? "Security deposit refund"
      : String(category || "other").replaceAll("_", " ");

  window.PropertyDeskDisplayUtils = Object.freeze({
    money,
    esc,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  });
})();
