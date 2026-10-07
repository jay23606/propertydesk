/* Connect the Properties grid, overview, and property detail screen. */
(() => {
  "use strict";

  function createPropertyWorkspaceWorkflow({ detail, overview, portfolio }) {
    const propertyDetails =
      window.PropertyDeskPropertyScreenWorkflow.create(detail);
    const propertyOverview = window.PropertyDeskOverviewWorkflow.create({
      ...overview,
      openPropertyDetails: propertyDetails.openPropertyDetails,
    });
    const properties = window.PropertyDeskPropertyPortfolioWorkflow.create({
      ...portfolio,
      openPropertyDetails: propertyDetails.openPropertyDetails,
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
