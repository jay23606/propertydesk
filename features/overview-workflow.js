/* Compose dashboard summaries, rendering, and property actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
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
      postedOnOrAfter,
      esc,
      prettyKind,
      money,
      propertyAddress,
      prettyType,
      fmtDate,
      openPropertyDetails,
      openPropertyPayment,
    } = context;

    const propertySummaryModel =
      window.PropertyDeskOverviewPropertySummaryModel.create({
        state,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
      });
    const overviewModel = window.PropertyDeskOverviewModel.create({
      state,
      propertySummaryModel,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
      postedOnOrAfter,
    });
    const overview = window.PropertyDeskOverview.create({
      $,
      esc,
      prettyKind,
      money,
      propertyAddress,
      prettyType,
      fmtDate,
      overviewModel,
    });
    const overviewEvents = window.PropertyDeskOverviewEvents.create({
      $,
      openPropertyDetails,
      openPropertyPayment,
    });

    return {
      renderOverview: overview.renderOverview,
      attachOverviewEvents: overviewEvents.attachEvents,
    };
  }

  window.PropertyDeskOverviewWorkflow = Object.freeze({ create });
})();
