/* Normalize typed currency amounts to cents. */
(() => {
  "use strict";

  const moneyInput = (value) => {
    const raw = String(value ?? "").trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, "");
    const amount = Number(normalized) * (negative ? -1 : 1);
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  };

  const utils = Object.freeze({ moneyInput });
  globalThis.PropertyDeskMoneyInputUtils = utils;
  if (typeof window !== "undefined")
    window.PropertyDeskMoneyInputUtils = Object.freeze({ moneyInput });
  if (typeof module !== "undefined" && module.exports) module.exports = utils;
})();
