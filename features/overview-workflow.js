/* Compose dashboard summaries, rendering, and property actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      monthlyScheduledEstimate,
      summarizeAccount,
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
        summarizeAccount,
      });
    const overviewModel = window.PropertyDeskOverviewModel.create({
      state,
      propertySummaryModel,
      activityModel: window.PropertyDeskOverviewActivityModel.create({
        isPosted,
      }),
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      postedOnOrAfter,
    });
    const overview = window.PropertyDeskOverview.create({
      $,
      money,
      overviewModel,
      overviewView: window.PropertyDeskOverviewView.create({
        esc,
        prettyKind,
        money,
        propertyAddress,
        prettyType,
        fmtDate,
      }),
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
