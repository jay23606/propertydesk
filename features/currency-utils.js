/* Shared currency parsing and cent rounding. */
(() => {
  "use strict";

  const roundCurrency = (value) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const moneyInput = (value) => {
    const raw = String(value ?? "").trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, "");
    const amount = Number(normalized) * (negative ? -1 : 1);
    if (!Number.isFinite(amount)) return 0;
    return roundCurrency(amount);
  };

  if (typeof window !== "undefined") {
    window.PropertyDeskCurrencyUtils = Object.freeze({
      moneyInput,
      roundCurrency,
    });
    globalThis.PropertyDeskCurrencyUtils = window.PropertyDeskCurrencyUtils;
  } else {
    globalThis.PropertyDeskCurrencyUtils = Object.freeze({
      moneyInput,
      roundCurrency,
    });
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = globalThis.PropertyDeskCurrencyUtils;
})();
