/* Group workspace accounts by property for portfolio and dashboard models. */
(() => {
  "use strict";

  function groupByProperty(accounts) {
    const accountsByProperty = new Map();
    for (const account of accounts) {
      const related = accountsByProperty.get(account.property_id) || [];
      related.push(account);
      accountsByProperty.set(account.property_id, related);
    }
    return accountsByProperty;
  }

  window.PropertyDeskPropertyAccountIndex = Object.freeze({ groupByProperty });
})();
