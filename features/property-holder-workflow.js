/* Compose property-holder label updates with their event route. */
(() => {
  "use strict";

  function create({ $, state, toast, fetchAll, openPropertyDetails }) {
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
      });
    const { attachEvents } = window.PropertyDeskPropertyHolderEvents.create({
      $,
      savePropertyHolders,
    });

    return { attachEvents };
  }

  window.PropertyDeskPropertyHolderWorkflow = Object.freeze({ create });
})();
