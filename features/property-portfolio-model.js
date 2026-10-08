/* Derive visible portfolio rows and totals from workspace records and filters. */
(() => {
  "use strict";

  function createPropertyPortfolioModel({
    state,
    accountRowModel,
    streetAddress,
    filterModel,
  }) {
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

    function rowsForProperty(
      property,
      filters,
      accountsByProperty,
      assignedHolders,
    ) {
      if (!filterModel.propertyIsVisible(property, filters, assignedHolders))
        return [];

      const allRelated = accountsByProperty.get(property.id) || [];
      const visible = filterModel.activeAccountsForProperty(
        allRelated,
        filters.showArchived,
      );
      const street = streetAddress(property);
      const matches = visible.filter((account) =>
        filterModel.accountMatches(property, account, filters),
      );

      if (matches.length) {
        return matches.map((account) =>
          accountRowModel.buildAccountRow(property, account, street),
        );
      }
      if (filterModel.shouldShowEmptyProperty(property, allRelated, filters))
        return [emptyPropertyRow(property, street)];
      return [];
    }

    function buildRows({ query, type, holderId, showArchived }) {
      const accountsByProperty =
        window.PropertyDeskPropertyAccountIndex.groupByProperty(state.accounts);
      const assignedHolders = filterModel.holdersByProperty();
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

      return rows.sort(filterModel.compareRows);
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

    return Object.freeze({ buildRows, totalsFor });
  }

  window.PropertyDeskPropertyPortfolioModel = Object.freeze({
    create: createPropertyPortfolioModel,
  });
})();
