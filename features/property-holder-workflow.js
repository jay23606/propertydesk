/* Compose property account-holder label saves with their detail event binder. */
(() => {
  "use strict";

  function createPropertyHolderWorkflow(context) {
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create(context);
    const { attachPropertyHolderEvents } =
      window.PropertyDeskPropertyHolderEvents.create({
        $: context.$,
        savePropertyHolders,
      });

    return { attachPropertyHolderEvents };
  }

  window.PropertyDeskPropertyHolderWorkflow = Object.freeze({
    create: createPropertyHolderWorkflow,
  });
})();
