/* Derive visible portfolio rows and totals from workspace records and filters. */
(() => {
  "use strict";

  function createPropertyPortfolioModel({
    state,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    propertyAddress,
    monthStart,
    streetAddress,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    paymentStatusInMonth,
    money,
  }) {
    function buildRows({ query, type, holderId, showArchived }) {
      const rows = [];
      for (const property of state.properties) {
        const tags = state.propertyHolders
          .filter((row) => row.property_id === property.id)
          .map((row) => row.member_user_id);
        if (property.archived_at && !showArchived) continue;
        if (holderId !== "all" && !tags.includes(holderId)) continue;

        const allRelated = state.accounts.filter(
            (account) => account.property_id === property.id,
          ),
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
            const unpaidDue = amountDueSince(
              [account],
              state.payments,
              unpaidDueAccrualStart(),
              todayIso(),
            );
            const scheduledPayment = monthlyScheduledEstimate([
              { ...account, status: "active" },
            ]);
            const partyName = account.party_name || account.name;
            const address = propertyAddress(property);
            const reminderHref = lateReminderMailto({
              email: account.party_email,
              address,
              unpaidDue: money(unpaidDue),
              senderName:
                state.user?.user_metadata?.display_name?.trim() ||
                "PropertyDesk",
              recipientName: partyName,
              month: dateOnly(monthStart()).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              }),
              asOf: monthEnd(),
            });
            const recipientHint = account.party_email
              ? "Draft late reminder email"
              : "No email saved; opens an unaddressed late reminder draft";
            const scheduledThisMonth =
              amountDueSince(
                [{ ...account, status: "active" }],
                [],
                monthStart(),
                monthEnd(),
              ) || Number(account.payment_amount || 0);
            const paymentStatus = paymentStatusInMonth(
              state.payments,
              account.id,
              monthStart(),
              scheduledThisMonth,
            );
            const hasLoanBalance = account.account_type !== "rental";
            rows.push({
              hasAccount: true,
              party: partyName,
              account: account.name,
              address: street,
              id: account.id,
              property,
              accountRecord: account,
              street,
              unpaidDue,
              scheduledPayment,
              loanBalance: hasLoanBalance ? accountBalance(account) : 0,
              hasLoanBalance,
              partyName,
              paymentStatus,
              reminderHref,
              recipientHint,
            });
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
