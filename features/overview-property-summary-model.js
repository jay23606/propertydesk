/* Derive the financial summary shown on one dashboard property card. */
(() => {
  "use strict";

  function createOverviewPropertySummaryModel({
    state,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
  }) {
    function summarizeProperty(property) {
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
          ...new Set(
            active.map((account) => account.party_name).filter(Boolean),
          ),
        ].join(", "),
      };
    }

    return { summarizeProperty };
  }

  window.PropertyDeskOverviewPropertySummaryModel = Object.freeze({
    create: createOverviewPropertySummaryModel,
  });
})();
