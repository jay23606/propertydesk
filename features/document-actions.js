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
    repository = window.PropertyDeskDocumentRepository.create(
      () => state.client,
    ),
  }) {
    const { deletePropertyDocument } = window.PropertyDeskDocumentDelete.create(
      {
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        confirm,
        repository,
      },
    );
    const { openPropertyDocument } = window.PropertyDeskDocumentOpen.create({
      state,
      toast,
      openWindow,
      repository,
    });

    return { deletePropertyDocument, openPropertyDocument };
  }

  window.PropertyDeskDocumentActions = Object.freeze({ create });
})();
