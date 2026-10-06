/* Connect staged CSV previews to their review, correction, and commit events. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, selectImportRows, esc, openModal, closeModal, toast } =
      context;
    const preview = window.PropertyDeskImportPreview.create({
      $,
      state,
      selectImportRows,
      esc,
      openModal,
    });
    const { attachEvents } = window.PropertyDeskImportPreviewEvents.create({
      $,
      state,
      selectImportRows,
      renderImportPreview: preview.renderImportPreview,
      updateImportCommitButton: preview.updateImportCommitButton,
      closeModal,
      toast,
    });

    return { stageImport: preview.stageImport, attachEvents };
  }

  window.PropertyDeskImportPreviewWorkflow = Object.freeze({ create });
})();
