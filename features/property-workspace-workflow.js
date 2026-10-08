/* Connect the Properties grid, overview, and property detail screen. */
(() => {
  "use strict";

  function createPropertyWorkspaceWorkflow({
    detail,
    overview,
    portfolio,
    groupAccountsByProperty,
    isActiveAccount,
    workflows,
  }) {
    const propertyDetails = detail.workflows.screen.create({
      content: detail.content,
      management: detail.management,
      holders: detail.holders,
      documents: detail.documents,
      workflows: detail.workflows,
    });
    const propertyOverview = workflows.overview.create({
      $: overview.$,
      state: overview.state,
      groupAccountsByProperty,
      isActiveAccount,
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
      workflows: overview.workflows,
    });
    const properties = workflows.portfolio.create({
      $: portfolio.$,
      state: portfolio.state,
      groupAccountsByProperty,
      isActiveAccount,
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
      lateReminderSms: portfolio.lateReminderSms,
      paymentStatusInMonth: portfolio.paymentStatusInMonth,
      toast: portfolio.toast,
      fetchAll: portfolio.fetchAll,
      openPayment: portfolio.openPayment,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      openAccountForProperty: portfolio.openAccountForProperty,
      editAccount: portfolio.editAccount,
      propertyRepository: portfolio.propertyRepository,
      workflows: portfolio.workflows,
    });

    return Object.freeze({
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
    });
  }

  window.PropertyDeskPropertyWorkspaceWorkflow = Object.freeze({
    create: createPropertyWorkspaceWorkflow,
  });
})();
