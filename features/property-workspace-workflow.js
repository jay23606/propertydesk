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
    const { screen, ...detailWorkflows } = detail.workflows;
    const propertyDetails = screen.create({
      ...detail,
      workflows: detailWorkflows,
    });
    const propertyOverview = workflows.overview.create({
      ...overview,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails: propertyDetails.openPropertyDetails,
    });
    const properties = workflows.portfolio.create({
      ...portfolio,
      groupAccountsByProperty,
      isActiveAccount,
      openPropertyDetails: propertyDetails.openPropertyDetails,
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
