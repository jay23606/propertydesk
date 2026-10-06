/* Derive visible portfolio rows and totals from workspace records and filters. */
(() => {
  "use strict";

  function createPropertyPortfolioModel({
    state,
    accountRowModel,
    propertyAddress,
    streetAddress,
  }) {
    function holdersByProperty() {
      const holdersByProperty = new Map();
      for (const row of state.propertyHolders) {
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

    function emptyPropertyRow(property, street) {
      return {
        hasAccount: false,
        party: "",
        account: "",
        address: street,
        id: property.id,
        property,
        street,
      };
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
        (account) => showArchived || (account.status || "active") === "active",
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

    function rowsForProperty(
      property,
      filters,
      accountsByProperty,
      assignedHolders,
    ) {
      if (!propertyIsVisible(property, filters, assignedHolders)) return [];

      const allRelated = accountsByProperty.get(property.id) || [];
      const visible = activeAccountsForProperty(
        allRelated,
        filters.showArchived,
      );
      const street = streetAddress(property);
      const matches = visible.filter((account) =>
        accountMatches(property, account, filters),
      );

      if (matches.length) {
        return matches.map((account) =>
          accountRowModel.buildAccountRow(property, account, street),
        );
      }
      if (shouldShowEmptyProperty(property, allRelated, filters))
        return [emptyPropertyRow(property, street)];
      return [];
    }

    function buildRows({ query, type, holderId, showArchived }) {
      const accountsByProperty =
        window.PropertyDeskPropertyAccountIndex.groupByProperty(state.accounts);
      const assignedHolders = holdersByProperty();
      const rows = [];

      for (const property of state.properties) {
        rows.push(
          ...rowsForProperty(
            property,
            { query, type, holderId, showArchived },
            accountsByProperty,
            assignedHolders,
          ),
        );
      }

      return rows.sort(compareRows);
    }

    function totalsFor(rows) {
      return rows.reduce(
        (totals, row) => {
          if (!row.hasAccount) return totals;
          totals.unpaidDue += row.unpaidDue;
          totals.scheduledPayment += row.scheduledPayment;
          totals.loanBalance += row.loanBalance;
          if (row.hasLoanBalance) totals.loanCount++;
          return totals;
        },
        { unpaidDue: 0, scheduledPayment: 0, loanBalance: 0, loanCount: 0 },
      );
    }

    return { buildRows, totalsFor };
  }

  window.PropertyDeskPropertyPortfolioModel = Object.freeze({
    create: createPropertyPortfolioModel,
  });
})();
