/* Compose Properties grid rendering with its quick-action event handlers. */
(() => {
  "use strict";

  function create(context) {
    const { renderProperties, attachEvents: attachPortfolioEvents } =
      window.PropertyDeskPropertyPortfolioWorkflow.create(context);
    const { attachEvents: attachPortfolioActionEvents } =
      window.PropertyDeskPropertyPortfolioActionsWorkflow.create(context);

    return {
      renderProperties,
      attachPortfolioEvents,
      attachPortfolioActionEvents,
    };
  }

  window.PropertyDeskPropertyPortfolioScreenWorkflow = Object.freeze({
    create,
  });
})();
