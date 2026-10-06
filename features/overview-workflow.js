/* Compose the dashboard renderer with its property-card actions. */
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
      esc,
      prettyKind,
      money,
      propertyAddress,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
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
    });
    const { renderOverview } = window.PropertyDeskOverview.create({
      $,
      esc,
      prettyKind,
      money,
      propertyAddress,
      prettyType,
      fmtDate,
      overviewModel,
    });
    const { attachEvents: attachOverviewEvents } =
      window.PropertyDeskOverviewEvents.create({
        $,
        openPropertyDetails,
        openPropertyPayment,
      });

    return { renderOverview, attachOverviewEvents };
  }

  window.PropertyDeskOverviewWorkflow = Object.freeze({ create });
})();
