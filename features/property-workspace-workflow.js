/* Connect the Properties grid, overview, and property detail screen. */
(() => {
  "use strict";

  function createPropertyWorkspaceWorkflow({ detail, overview, portfolio }) {
    const propertyDetails =
      window.PropertyDeskPropertyScreenWorkflow.create(detail);
    const propertyOverview = window.PropertyDeskOverviewWorkflow.create({
      $: overview.$,
      state: overview.state,
      monthlyScheduledEstimate: overview.monthlyScheduledEstimate,
      summarizeAccount: overview.summarizeAccount,
      collectedSince: overview.collectedSince,
      scheduledMonthlyRunRate: overview.scheduledMonthlyRunRate,
      monthStart: overview.monthStart,
      isPosted: overview.isPosted,
      postedOnOrAfter: overview.postedOnOrAfter,
      esc: overview.esc,
      prettyKind: overview.prettyKind,
      money: overview.money,
      propertyAddress: overview.propertyAddress,
      prettyType: overview.prettyType,
      fmtDate: overview.fmtDate,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      openPropertyPayment: overview.openPropertyPayment,
    });
    const properties = window.PropertyDeskPropertyPortfolioWorkflow.create({
      $: portfolio.$,
      state: portfolio.state,
      esc: portfolio.esc,
      money: portfolio.money,
      paymentFrequencyLabel: portfolio.paymentFrequencyLabel,
      monthlyScheduledEstimate: portfolio.monthlyScheduledEstimate,
      summarizeAccount: portfolio.summarizeAccount,
      amountDueSince: portfolio.amountDueSince,
      propertyAddress: portfolio.propertyAddress,
      streetAddress: portfolio.streetAddress,
      monthStart: portfolio.monthStart,
      dateOnly: portfolio.dateOnly,
      monthEnd: portfolio.monthEnd,
      lateReminderMailto: portfolio.lateReminderMailto,
      paymentStatusInMonth: portfolio.paymentStatusInMonth,
      toast: portfolio.toast,
      fetchAll: portfolio.fetchAll,
      openPayment: portfolio.openPayment,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      openAccountForProperty: portfolio.openAccountForProperty,
    });

    return {
      openPropertyDetails: propertyDetails.openPropertyDetails,
      attachPropertyDetailEvents: propertyDetails.attachPropertyDetailEvents,
      attachPropertyQuickActionEvents:
        propertyDetails.attachPropertyQuickActionEvents,
      attachPropertyHolderEvents: propertyDetails.attachPropertyHolderEvents,
      attachPropertyDocumentEvents:
        propertyDetails.attachPropertyDocumentEvents,
      renderOverview: propertyOverview.renderOverview,
      attachOverviewEvents: propertyOverview.attachOverviewEvents,
      renderProperties: properties.renderProperties,
      attachPropertyGridEvents: properties.attachPropertyGridEvents,
      attachPropertyActionEvents: properties.attachPropertyActionEvents,
    };
  }

  window.PropertyDeskPropertyWorkspaceWorkflow = Object.freeze({
    create: createPropertyWorkspaceWorkflow,
  });
})();
