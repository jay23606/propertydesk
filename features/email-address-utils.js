/* Parse and validate comma- or semicolon-separated email address lists. */
(() => {
  "use strict";

  function splitEmailAddresses(value) {
    return String(value || "")
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  function isValidEmailAddress(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
  }

  const helpers = Object.freeze({ splitEmailAddresses, isValidEmailAddress });
  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskEmailAddressUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
