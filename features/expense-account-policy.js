/* Shared account requirements for expense categories. */
(() => {
  "use strict";

  const runtime = typeof window !== "undefined" ? window : globalThis;
  const { depositRefundCategory } = runtime.PropertyDeskTransactionOptions;

  function requiresRentalAccount(category) {
    return category === depositRefundCategory;
  }

  function accountMatchesCategory(category, account) {
    return (
      !requiresRentalAccount(category) || account?.account_type === "rental"
    );
  }

  const policy = Object.freeze({
    requiresRentalAccount,
    accountMatchesCategory,
  });
  runtime.PropertyDeskExpenseAccountPolicy = policy;
  globalThis.PropertyDeskExpenseAccountPolicy = policy;
  if (typeof module !== "undefined" && module.exports) module.exports = policy;
})();
