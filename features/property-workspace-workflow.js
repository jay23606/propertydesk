/* Connect the Properties grid, overview, and property detail screen. */
(() => {
  "use strict";

  function createPropertyDetails(detail) {
    return detail.workflows.screen.create({
      content: detail.content,
      management: detail.management,
      holders: detail.holders,
      documents: detail.documents,
      workflows: {
        content: detail.workflows.content,
        management: detail.workflows.management,
        holders: detail.workflows.holders,
        contentModules: detail.workflows.contentModules,
        managementModules: detail.workflows.managementModules,
        holderModules: detail.workflows.holderModules,
      },
    });
  }

  function createPropertyOverview({
    overview,
    groupAccountsByProperty,
    isActiveAccount,
    openPropertyDetails,
    workflow,
  }) {
    return workflow.create({
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
      openPropertyDetails,
      openPropertyPayment: overview.openPropertyPayment,
      workflows: overview.workflows,
    });
  }

  function createPropertiesPortfolio({
    portfolio,
    groupAccountsByProperty,
    isActiveAccount,
    openPropertyDetails,
    workflow,
  }) {
    return workflow.create({
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
      saveAndRefreshWorkspaceRecord: portfolio.saveAndRefreshWorkspaceRecord,
      promptAction: portfolio.promptAction,
      openPayment: portfolio.openPayment,
      openPropertyDetails,
      openAccountForProperty: portfolio.openAccountForProperty,
      editAccount: portfolio.editAccount,
      propertyRepository: portfolio.propertyRepository,
      workflows: portfolio.workflows,
    });
  }

  function createPropertyWorkspaceWorkflow({
    detail,
    overview,
    portfolio,
    groupAccountsByProperty,
    isActiveAccount,
    workflows,
  }) {
    const propertyDetails = createPropertyDetails(detail);
    const propertyOverview = createPropertyOverview({
      overview,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      workflow: workflows.overview,
    });
    const properties = createPropertiesPortfolio({
      portfolio,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      workflow: workflows.portfolio,
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
