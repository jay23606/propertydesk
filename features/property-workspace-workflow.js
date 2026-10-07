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

    return { ...propertyDetails, ...propertyOverview, ...properties };
  }

  window.PropertyDeskPropertyWorkspaceWorkflow = Object.freeze({
    create: createPropertyWorkspaceWorkflow,
  });
})();
