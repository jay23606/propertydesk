/* Compose independent private-agreement deletion and opening actions. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    confirm,
    openWindow,
    repository,
    writeFeedback,
  }) {
    const { deletePropertyDocument } = window.PropertyDeskDocumentDelete.create(
      {
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        confirm,
        repository,
        writeFeedback,
      },
    );
    const { openPropertyDocument } = window.PropertyDeskDocumentOpen.create({
      state,
      toast,
      openWindow,
      repository,
    });

    return Object.freeze({ deletePropertyDocument, openPropertyDocument });
  }

  window.PropertyDeskDocumentActions = Object.freeze({ create });
})();
