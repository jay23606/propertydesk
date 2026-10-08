/* Compose property-holder label saving with its detail event router. */
(() => {
  "use strict";

  function createPropertyHolderWorkflow({
    $,
    state,
    toast,
    fetchAll,
    repository,
    openPropertyDetails,
  }) {
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state,
        toast,
        fetchAll,
        repository,
        openPropertyDetails,
      });
    const { attachPropertyHolderEvents } =
      window.PropertyDeskPropertyHolderEvents.create({
        $,
        savePropertyHolders,
      });

    return Object.freeze({ attachPropertyHolderEvents });
  }

  window.PropertyDeskPropertyHolderWorkflow = Object.freeze({
    create: createPropertyHolderWorkflow,
  });
})();
