/* Compose the dashboard renderer with its property-card actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, monthlyScheduledEstimate, accountBalance, amountDueSince,
      unpaidDueAccrualStart, todayIso, esc, prettyKind, money,
      propertyAddress, collectedSince, scheduledMonthlyRunRate, monthStart,
      isPosted, prettyType, fmtDate, openPropertyDetails, openPropertyPayment,
    } = context;
    const { renderOverview } = window.PropertyDeskOverview.create({
      $, state, monthlyScheduledEstimate, accountBalance, amountDueSince,
      unpaidDueAccrualStart, todayIso, esc, prettyKind, money,
      propertyAddress, collectedSince, scheduledMonthlyRunRate, monthStart,
      isPosted, prettyType, fmtDate,
    });
    const { attachEvents: attachOverviewEvents } =
      window.PropertyDeskOverviewEvents.create({
        $, openPropertyDetails, openPropertyPayment,
      });

    return { renderOverview, attachOverviewEvents };
  }

  window.PropertyDeskOverviewWorkflow = Object.freeze({ create });
})();
