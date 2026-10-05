/* Shared formatting, labels, and input normalization for PropertyDesk. */
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
  const dateOnly = (value) => (value ? new Date(`${value}T12:00:00`) : null);
  const fmtDate = (
    value,
    options = { month: "short", day: "numeric", year: "numeric" },
  ) => {
    const date = dateOnly(value);
    return date ? date.toLocaleDateString(undefined, options) : "—";
  };
  const todayIso = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
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
  const monthStart = () => {
    const date = new Date();
    date.setDate(1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}-01`;
  };
  const monthEnd = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const propertyLocation = (property) =>
    [property.city, property.state, property.postal_code]
      .filter(Boolean)
      .join(", ");
  const propertyAddress = (property) =>
    [property.address, propertyLocation(property)].filter(Boolean).join(", ");
  const streetAddress = (property) =>
    String(property.address || property.name || "")
      .split(",")[0]
      .trim();
  const moneyInput = (value) => {
    const raw = String(value ?? "").trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, "");
    const amount = Number(normalized) * (negative ? -1 : 1);
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  };
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

  window.PropertyDeskAppUtils = Object.freeze({
    money,
    dateOnly,
    fmtDate,
    todayIso,
    esc,
    prettyType,
    prettyKind,
    monthStart,
    monthEnd,
    propertyLocation,
    propertyAddress,
    streetAddress,
    moneyInput,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  });
})();
