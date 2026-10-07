/* Validate and normalize numeric values and dates from CSV fields. */
(() => {
  "use strict";

  const moneyInput = globalThis.PropertyDeskMoneyInputUtils?.moneyInput;
  if (!moneyInput)
    throw new Error("The PropertyDesk money input helper is not loaded.");

  function hasValidCsvMoneyFormat(raw) {
    const number = "(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?";
    return (
      new RegExp(`^\\(\\s*\\$?\\s*${number}\\s*\\)$`).test(raw) ||
      new RegExp(`^\\$?\\s*${number}$`).test(raw)
    );
  }

  function validateMinimumAmount(amount, label, minimum) {
    if (amount < minimum)
      throw new Error(
        `Amount for ${label} must be ${minimum === 0 ? "zero or greater" : "greater than zero"}.`,
      );
  }

  function csvMoney(value, label, { optional = false, minimum = 0 } = {}) {
    const raw = String(value ?? "").trim();
    if (!raw && optional) return 0;
    if (!hasValidCsvMoneyFormat(raw))
      throw new Error(`Invalid amount “${raw}” for ${label}.`);
    const amount = moneyInput(raw);
    validateMinimumAmount(amount, label, minimum);
    return amount;
  }

  function csvRate(value, label, { optional = false } = {}) {
    const raw = String(value ?? "")
      .trim()
      .replace(/%$/, "")
      .trim();
    if (!raw && optional) return 0;
    if (!/^\d+(?:\.\d{1,5})?$/.test(raw))
      throw new Error(`Invalid rate “${value}” for ${label}.`);
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw new Error(`Rate for ${label} must be between 0 and 100%.`);
    return rate;
  }

  function validIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(`${value}T12:00:00`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

  const helpers = Object.freeze({ csvMoney, csvRate, validIsoDate });
  globalThis.PropertyDeskCsvValueUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
