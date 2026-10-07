/* Keep legacy missing-status accounts on the same active-account default. */
(() => {
  "use strict";

  function isActiveAccount(account) {
    return (account.status || "active") === "active";
  }

  const accountStatus = Object.freeze({ isActiveAccount });
  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskAccountStatusUtils = accountStatus;
  if (typeof module !== "undefined" && module.exports)
    module.exports = accountStatus;
})();
