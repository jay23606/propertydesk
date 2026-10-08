/* Correction, duplicate-selection, and commit actions for staged imports. */
(() => {
  "use strict";

  function createImportPreviewEvents({
    $,
    state,
    selectImportRows,
    renderImportPreview,
    updateImportCommitButton,
    closeModal,
    toast,
  }) {
    function attachEvents() {
      $("import-correction-body").addEventListener("change", (event) => {
        const input = event.target.closest("[data-import-correction]");
        const pending = state.pendingImport;
        if (!input || !pending?.revalidate) return;
        const row = pending.rawRows.find(
          (item) => Number(item._source_row) === Number(input.dataset.row),
        );
        if (!row) return;
        Object.defineProperty(row, input.dataset.column, {
          value: input.value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        const reviewed = pending.revalidate(pending.rawRows);
        pending.rows = reviewed.valid;
        pending.errors = reviewed.errors;
        pending.total = reviewed.total;
        $("import-include-duplicates").checked = false;
        renderImportPreview();
      });

      $("import-include-duplicates").addEventListener(
        "change",
        updateImportCommitButton,
      );
      $("import-commit").addEventListener("click", async () => {
        const pending = state.pendingImport;
        if (!pending) return;
        const selected = selectImportRows(
          pending.rows,
          $("import-include-duplicates").checked,
        );
        if (!selected.length) {
          toast("No new rows to import.");
          return;
        }
        $("import-commit").disabled = true;
        $("import-commit").textContent = "Importing…";
        try {
          await pending.commit(selected, pending);
          state.pendingImport = null;
          closeModal("import-preview-modal");
        } catch (error) {
          pending.commitUnconfirmed = true;
          $("import-preview-summary").textContent =
            `Import status couldn't be confirmed. Reload the workspace and check Reports import history before retrying. ${error.message}`;
          updateImportCommitButton();
        } finally {
          updateImportCommitButton();
        }
      });
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskImportPreviewEvents = Object.freeze({
    create: createImportPreviewEvents,
  });
})();
