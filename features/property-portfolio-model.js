/* Derive visible portfolio rows and totals from workspace records and filters. */
(() => {
  "use strict";

  function createPropertyPortfolioModel({
    state,
    accountRowModel,
    propertyAddress,
    streetAddress,
  }) {
    function buildRows({ query, type, holderId, showArchived }) {
      const rows = [];
      const accountsByProperty = new Map();
      for (const account of state.accounts) {
        const related = accountsByProperty.get(account.property_id) || [];
        related.push(account);
        accountsByProperty.set(account.property_id, related);
      }
      const holdersByProperty = new Map();
      for (const row of state.propertyHolders) {
        const holders = holdersByProperty.get(row.property_id) || new Set();
        holders.add(row.member_user_id);
        holdersByProperty.set(row.property_id, holders);
      }

      for (const property of state.properties) {
        if (property.archived_at && !showArchived) continue;
        if (
          holderId !== "all" &&
          !holdersByProperty.get(property.id)?.has(holderId)
        )
          continue;

        const allRelated = accountsByProperty.get(property.id) || [],
          related = allRelated.filter(
            (account) =>
              showArchived || (account.status || "active") === "active",
          ),
          matches = related.filter(
            (account) =>
              (type === "all" || account.account_type === type) &&
              (!query ||
                `${property.name} ${propertyAddress(property)} ${property.notes || ""} ${account.name} ${account.party_name || ""}`
                  .toLowerCase()
                  .includes(query)),
          );
        const street = streetAddress(property);

        if (matches.length) {
          for (const account of matches) {
            rows.push(
              accountRowModel.buildAccountRow(property, account, street),
            );
          }
        } else if (
          allRelated.length === 0 &&
          type === "all" &&
          (!query ||
            `${property.name} ${propertyAddress(property)} ${property.notes || ""}`
              .toLowerCase()
              .includes(query))
        ) {
          rows.push({
            hasAccount: false,
            party: "",
            account: "",
            address: street,
            id: property.id,
            property,
            street,
          });
        }
      }

      const compare = (a, b) =>
        String(a || "").localeCompare(String(b || ""), undefined, {
          sensitivity: "base",
          numeric: true,
        });
      return rows.sort(
        (a, b) =>
          Number(b.hasAccount) - Number(a.hasAccount) ||
          compare(a.party, b.party) ||
          compare(a.account, b.account) ||
          compare(a.address, b.address) ||
          compare(a.id, b.id),
      );
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
