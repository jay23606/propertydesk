/* Stage, correct, and commit approved CSV import batches. */
(() => {
  "use strict";

  function createImportPreview(context) {
    const { $, state, selectImportRows, esc, openModal } = context;
    const { renderImportPreview, updateImportCommitButton } =
      window.PropertyDeskImportPreviewRendering.create({
        $,
        state,
        selectImportRows,
        esc,
      });

    function stageImport(title, rows, commit, note = "", report = {}) {
      const total = Number(report.total ?? rows.length);
      const errors = report.errors || [];
      if (total > 500) {
        throw new Error(
          "Imports are limited to 500 rows at a time. Split the CSV and review each batch.",
        );
      }
      if (!rows.length && !errors.length) {
        throw new Error("The CSV file has no importable rows.");
      }
      state.pendingImport = {
        title,
        rows,
        commit,
        errors,
        total,
        note,
        rawRows: report.rawRows || [],
        correctionKeys: report.correctionKeys || [],
        revalidate: report.revalidate || null,
      };
      $("import-include-duplicates").checked = false;
      renderImportPreview();
      openModal("import-preview-modal");
    }

    return { stageImport, renderImportPreview, updateImportCommitButton };
  }

  window.PropertyDeskImportPreview = Object.freeze({
    create: createImportPreview,
  });
})();
