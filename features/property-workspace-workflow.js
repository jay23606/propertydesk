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
      workflows: {
        content: detail.workflows.content,
        management: detail.workflows.management,
        holders: detail.workflows.holders,
        contentModules: detail.workflows.contentModules,
        managementModules: detail.workflows.managementModules,
        holderModules: detail.workflows.holderModules,
      },
    });
    const propertyOverview = workflows.overview.create({
      $: overview.$,
      getProperties: overview.getProperties,
      getAccounts: overview.getAccounts,
      getPayments: overview.getPayments,
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
      getSenderName: portfolio.getSenderName,
      getPayments: portfolio.getPayments,
      getPropertyHolders: portfolio.getPropertyHolders,
      getProperties: portfolio.getProperties,
      getAccounts: portfolio.getAccounts,
      getWorkspaceMembers: portfolio.getWorkspaceMembers,
      editPropertyQuickNote: portfolio.editPropertyQuickNote,
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
      storage: portfolio.storage,
      toast: portfolio.toast,
      openWindow: portfolio.openWindow,
      schedule: portfolio.schedule,
      openPayment: portfolio.openPayment,
      openPropertyDetails: propertyDetails.openPropertyDetails,
      openAccountForProperty: portfolio.openAccountForProperty,
      editAccount: portfolio.editAccount,
      openModal: portfolio.openModal,
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
