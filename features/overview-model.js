/* Build dashboard summaries from the current workspace ledger. */
(() => {
  "use strict";

  function createOverviewModel({
    getProperties,
    getAccounts,
    getPayments,
    isActiveAccount,
    propertySummaryModel,
    groupAccountsByProperty,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    postedOnOrAfter,
    activityModel,
  }) {
    function buildOverview() {
      const currentMonthStart = monthStart();
      const properties = getProperties();
      const accounts = getAccounts();
      const payments = getPayments();
      const activeProperties = properties.filter(
        (property) => !property.archived_at,
      );
      const propertyById = new Map(
        properties.map((property) => [property.id, property]),
      );
      const accountsByProperty = groupAccountsByProperty(accounts);
      const accountById = new Map(
        accounts.map((account) => [account.id, account]),
      );
      const postedThisMonth = postedOnOrAfter(
        payments,
        "received_date",
        currentMonthStart,
      );
      const upcoming = activityModel.upcomingPayments(accounts, propertyById);
      const recent = activityModel.recentPayments(
        payments,
        accountById,
        propertyById,
      );

      return {
        propertyCount: activeProperties.length,
        accountCount: accounts.filter(
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
