/* Keep Properties search, visibility, and row ordering rules together. */
(() => {
  "use strict";

  function createPropertyPortfolioFilterModel({
    getPropertyHolders,
    propertyAddress,
    isActiveAccount,
  }) {
    function holdersByProperty() {
      const holdersByProperty = new Map();
      for (const row of getPropertyHolders()) {
        const holders = holdersByProperty.get(row.property_id) || new Set();
        holders.add(row.member_user_id);
        holdersByProperty.set(row.property_id, holders);
      }
      return holdersByProperty;
    }

    function accountMatches(property, account, { query, type }) {
      return (
        (type === "all" || account.account_type === type) &&
        (!query ||
          `${property.name} ${propertyAddress(property)} ${property.notes || ""} ${account.name} ${account.party_name || ""}`
            .toLowerCase()
            .includes(query))
      );
    }

    function propertyMatchesQuery(property, query) {
      return (
        !query ||
        `${property.name} ${propertyAddress(property)} ${property.notes || ""}`
          .toLowerCase()
          .includes(query)
      );
    }

    function propertyIsVisible(property, filters, assignedHolders) {
      const { holderId, showArchived } = filters;
      if (property.archived_at && !showArchived) return false;
      if (
        holderId !== "all" &&
        !assignedHolders.get(property.id)?.has(holderId)
      )
        return false;
      return true;
    }

    function activeAccountsForProperty(accounts, showArchived) {
      return accounts.filter(
        (account) => showArchived || isActiveAccount(account),
      );
    }

    function shouldShowEmptyProperty(property, allRelated, filters) {
      return (
        allRelated.length === 0 &&
        filters.type === "all" &&
        propertyMatchesQuery(property, filters.query)
      );
    }

    function compareRows(a, b) {
      const compare = (left, right) =>
        String(left || "").localeCompare(String(right || ""), undefined, {
          sensitivity: "base",
          numeric: true,
        });
      return (
        Number(b.hasAccount) - Number(a.hasAccount) ||
        compare(a.party, b.party) ||
        compare(a.account, b.account) ||
        compare(a.address, b.address) ||
        compare(a.id, b.id)
      );
    }

    return Object.freeze({
      holdersByProperty,
      accountMatches,
      propertyIsVisible,
      activeAccountsForProperty,
      shouldShowEmptyProperty,
      compareRows,
    });
  }

  window.PropertyDeskPropertyPortfolioFilterModel = Object.freeze({
    create: createPropertyPortfolioFilterModel,
  });
})();
