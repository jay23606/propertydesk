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
    const { summarizeAccount } =
      window.PropertyDeskAccountFinancialSummary.create({
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
      });

    function summarizeProperty(property, relatedAccounts) {
      const active = relatedAccounts.filter(
        (account) => (account.status || "active") === "active",
      );
      const financials = active.map((account) =>
        summarizeAccount(account, state.payments),
      );

      return {
        property,
        scheduledMonthly: monthlyScheduledEstimate(active),
        hasNonMonthly: active.some(
          (account) => account.payment_frequency !== "monthly",
        ),
        loanBalance: financials.reduce(
          (sum, summary) => sum + summary.loanBalance,
          0,
        ),
        hasLoanAccount: financials.some((summary) => summary.hasLoanBalance),
        amountDue: financials.reduce(
          (sum, summary) => sum + summary.unpaidDue,
          0,
        ),
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
