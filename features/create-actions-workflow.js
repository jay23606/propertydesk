/* Connect global create buttons to the entry forms they open. */
(() => {
  "use strict";

  function create(context) {
    const actions = window.PropertyDeskCreateActions.create(context);
    return { attachCreateActionEvents: actions.attachEvents };
  }

  window.PropertyDeskCreateActionsWorkflow = Object.freeze({ create });
})();
