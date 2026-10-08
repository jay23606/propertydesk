/* Build dashboard summaries from the current workspace ledger. */
(() => {
  "use strict";

  const { isActiveAccount } = window.PropertyDeskAccountStatusUtils;

  function createOverviewModel({
    state,
    propertySummaryModel,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    postedOnOrAfter,
    activityModel,
  }) {
    function buildOverview() {
      const currentMonthStart = monthStart();
      const activeProperties = state.properties.filter(
        (property) => !property.archived_at,
      );
      const propertyById = new Map(
        state.properties.map((property) => [property.id, property]),
      );
      const accountsByProperty =
        window.PropertyDeskPropertyAccountIndex.groupByProperty(state.accounts);
      const accountById = new Map(
        state.accounts.map((account) => [account.id, account]),
      );
      const postedThisMonth = postedOnOrAfter(
        state.payments,
        "received_date",
        currentMonthStart,
      );
      const upcoming = activityModel.upcomingPayments(
        state.accounts,
        propertyById,
      );
      const recent = activityModel.recentPayments(
        state.payments,
        accountById,
        propertyById,
      );

      return {
        propertyCount: activeProperties.length,
        accountCount: state.accounts.filter(
          (account) =>
            isActiveAccount(account) &&
            !propertyById.get(account.property_id)?.archived_at,
        ).length,
        collected: collectedSince(currentMonthStart),
        expected: scheduledMonthlyRunRate(),
        recordedPaymentCount: postedThisMonth.length,
        upcoming,
        recent,
        propertyCards: activeProperties
          .slice(0, 3)
          .map((property) =>
            propertySummaryModel.summarizeProperty(
              property,
              accountsByProperty.get(property.id) || [],
            ),
          ),
      };
    }

    return Object.freeze({ buildOverview });
  }

  window.PropertyDeskOverviewModel = Object.freeze({
    create: createOverviewModel,
  });
})();
