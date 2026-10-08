/* Compose dashboard summaries, rendering, and property actions. */
(() => {
  "use strict";

  function create({
    $,
    state,
    groupAccountsByProperty,
    isActiveAccount,
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
    workflows,
  }) {
    const propertySummaryModel = workflows.propertySummaryModel.create({
      state,
      isActiveAccount,
      monthlyScheduledEstimate,
      summarizeAccount,
    });
    const overviewModel = workflows.overviewModel.create({
      state,
      isActiveAccount,
      propertySummaryModel,
      groupAccountsByProperty,
      activityModel: workflows.activityModel.create({
        isPosted,
      }),
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      postedOnOrAfter,
    });
    const overview = workflows.overview.create({
      $,
      money,
      overviewModel,
      overviewView: workflows.view.create({
        esc,
        prettyKind,
        money,
        propertyAddress,
        prettyType,
        fmtDate,
      }),
    });
    const overviewEvents = workflows.events.create({
      $,
      openPropertyDetails,
      openPropertyPayment,
    });

    return Object.freeze({
      renderOverview: overview.renderOverview,
      attachOverviewEvents: overviewEvents.attachEvents,
    });
  }

  window.PropertyDeskOverviewWorkflow = Object.freeze({ create });
})();
