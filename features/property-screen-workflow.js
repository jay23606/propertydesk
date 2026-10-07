/* Compose property detail content with property management actions. */
(() => {
  "use strict";

  function createPropertyScreenWorkflow({ content, management }) {
    const details =
      window.PropertyDeskPropertyDetailContentWorkflow.create(content);
    const actions = window.PropertyDeskPropertyDetailManagementWorkflow.create({
      ...management,
      openPropertyDetails: details.openPropertyDetails,
    });

    return { ...details, ...actions };
  }

  window.PropertyDeskPropertyScreenWorkflow = Object.freeze({
    create: createPropertyScreenWorkflow,
  });
})();
