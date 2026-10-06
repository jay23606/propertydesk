/* Shared account, property, and schedule choices for forms and imports. */
(() => {
  "use strict";

  const freezeOptions = (options) =>
    Object.freeze(options.map((option) => Object.freeze(option)));
  const accountTypes = freezeOptions([
    { value: "rental", label: "Rental" },
    { value: "land_contract", label: "Land contract" },
    { value: "note", label: "Private note" },
  ]);
  const propertyKinds = freezeOptions([
    { value: "residential", label: "Residential" },
    { value: "land", label: "Land" },
    { value: "commercial", label: "Commercial" },
    { value: "other", label: "Other" },
  ]);
  const paymentFrequencies = freezeOptions([
    { value: "monthly", label: "Monthly", displayLabel: "Monthly" },
    { value: "weekly", label: "Weekly", displayLabel: "Weekly" },
    {
      value: "biweekly",
      label: "Every two weeks",
      displayLabel: "Every 2 weeks",
    },
    { value: "quarterly", label: "Quarterly", displayLabel: "Quarterly" },
    { value: "annual", label: "Annually", displayLabel: "Annually" },
  ]);
  const domainOptions = Object.freeze({
    accountTypes,
    propertyKinds,
    paymentFrequencies,
    defaults: Object.freeze({
      accountType: accountTypes[0].value,
      propertyKind: propertyKinds[0].value,
      paymentFrequency: paymentFrequencies[0].value,
    }),
  });

  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskDomainOptions = domainOptions;
  if (typeof module !== "undefined" && module.exports)
    module.exports = domainOptions;
})();
