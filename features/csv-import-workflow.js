/* Compose CSV import staging, review actions, and account/transaction handlers. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, esc, openModal, closeModal, toast, todayIso, fetchAll } =
      context;
    const { selectImportRows, parseCSV, createImportLookup } =
      window.PropertyDeskImportUtils;
    const { validateAccountRows, validatePaymentRows, validateExpenseRows } =
      window.PropertyDeskImportWorkflows;
    const preview = window.PropertyDeskImportPreview.create({
      $,
      state,
      selectImportRows,
      esc,
      openModal,
      closeModal,
      toast,
    });
    const { attachEvents: attachPreviewEvents } =
      window.PropertyDeskImportPreviewEvents.create({
        $,
        state,
        selectImportRows,
        renderImportPreview: preview.renderImportPreview,
        updateImportCommitButton: preview.updateImportCommitButton,
        closeModal,
        toast,
      });
    const { attachEvents: attachImportEvents } =
      window.PropertyDeskImportFeature.create({
        $,
        state,
        stageImport: preview.stageImport,
        parseCSV,
        createImportLookup,
        validateAccountRows,
        validatePaymentRows,
        validateExpenseRows,
        todayIso,
        fetchAll,
        toast,
      });

    function attachEvents() {
      attachPreviewEvents();
      attachImportEvents();
    }

    return { attachEvents };
  }

  window.PropertyDeskCsvImportWorkflow = Object.freeze({ create });
})();
