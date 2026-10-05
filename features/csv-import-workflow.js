/* Compose CSV import staging, review actions, and account/transaction handlers. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, selectImportRows, esc, openModal, closeModal, toast,
      parseCSV, todayIso, fetchAll,
    } = context;
    const preview = window.PropertyDeskImportPreview.create({
      $, state, selectImportRows, esc, openModal, closeModal, toast,
    });
    const { attachEvents: attachPreviewEvents } =
      window.PropertyDeskImportPreviewEvents.create({
        $, state, selectImportRows,
        renderImportPreview: preview.renderImportPreview,
        updateImportCommitButton: preview.updateImportCommitButton,
        closeModal, toast,
      });
    const importFeature = window.PropertyDeskImportFeature.create({
      $, state, stageImport: preview.stageImport, parseCSV,
      ...window.PropertyDeskImportWorkflows, todayIso, fetchAll, toast,
    });

    function attachEvents() {
      attachPreviewEvents();
      importFeature.attachEvents();
    }

    return { attachEvents };
  }

  window.PropertyDeskCsvImportWorkflow = Object.freeze({ create });
})();
