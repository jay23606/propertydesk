/* Connect the Properties grid, overview, and property detail screen. */
(() => {
  "use strict";

  function createPropertyDetails(detail) {
    const { screen, ...workflows } = detail.workflows;
    return screen.create({ ...detail, workflows });
  }

  function createPropertyOverview({
    overview,
    groupAccountsByProperty,
    isActiveAccount,
    openPropertyDetails,
    workflow,
  }) {
    return workflow.create({
      ...overview,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails,
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
      ...portfolio,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails,
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
