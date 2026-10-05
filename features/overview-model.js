/* Build dashboard summaries from the current workspace ledger. */
(() => {
  "use strict";

  function createOverviewModel({
    state,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    isPosted,
  }) {
    function propertySummary(property) {
      const related = state.accounts.filter(
        (account) => account.property_id === property.id,
      );
      const active = related.filter(
        (account) => (account.status || "active") === "active",
      );
      const loanAccounts = active.filter(
        (account) => account.account_type !== "rental",
      );
      const amountDue = active.reduce(
        (sum, account) =>
          sum +
          amountDueSince(
            [account],
            state.payments,
            unpaidDueAccrualStart(),
            todayIso(),
          ),
        0,
      );

      return {
        property,
        scheduledMonthly: monthlyScheduledEstimate(active),
        hasNonMonthly: active.some(
          (account) => account.payment_frequency !== "monthly",
        ),
        loanBalance: loanAccounts.reduce(
          (sum, account) => sum + accountBalance(account),
          0,
        ),
        hasLoanAccount: loanAccounts.length > 0,
        amountDue,
        parties: [
          ...new Set(active.map((account) => account.party_name).filter(Boolean)),
        ].join(", "),
      };
    }

    function buildOverview() {
      const currentMonthStart = monthStart();
      const activeProperties = state.properties.filter(
        (property) => !property.archived_at,
      );
      const propertyById = new Map(
        state.properties.map((property) => [property.id, property]),
      );
      const accountById = new Map(
        state.accounts.map((account) => [account.id, account]),
      );
      const postedThisMonth = state.payments.filter(
        (payment) =>
          isPosted(payment) &&
          String(payment.received_date) >= currentMonthStart,
      );
      const upcoming = state.accounts
        .filter((account) => account.status === "active" && account.next_due_date)
        .sort((a, b) =>
          String(a.next_due_date).localeCompare(String(b.next_due_date)),
        )
        .slice(0, 4)
        .map((account) => ({
          account,
          property: propertyById.get(account.property_id),
        }));
      const recent = state.payments
        .filter(isPosted)
        .slice(0, 4)
        .map((payment) => {
          const account = accountById.get(payment.account_id);
          return {
            payment,
            account,
            property: propertyById.get(account?.property_id),
          };
        });

      return {
        propertyCount: activeProperties.length,
        accountCount: state.accounts.filter(
          (account) =>
            (account.status || "active") === "active" &&
            !propertyById.get(account.property_id)?.archived_at,
        ).length,
        collected: collectedSince(currentMonthStart),
        expected: scheduledMonthlyRunRate(),
        recordedPaymentCount: postedThisMonth.length,
        upcoming,
        recent,
        propertyCards: activeProperties.slice(0, 3).map(propertySummary),
      };
    }

    return { buildOverview };
  }

  window.PropertyDeskOverviewModel = Object.freeze({
    create: createOverviewModel,
  });
})();
