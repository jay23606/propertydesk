/* Compose the dashboard renderer with its property-card actions. */
(() => {
  "use strict";

  function create(context) {
    const { openPropertyDetails, openPropertyPayment, ...viewContext } = context;
    const { renderOverview } = window.PropertyDeskOverview.create(viewContext);
    const { attachEvents: attachOverviewEvents } =
      window.PropertyDeskOverviewEvents.create({
        $: context.$, openPropertyDetails, openPropertyPayment,
      });

    return { renderOverview, attachOverviewEvents };
  }

  window.PropertyDeskOverviewWorkflow = Object.freeze({ create });
})();
