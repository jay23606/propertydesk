/* Stage, correct, and commit approved CSV import batches. */
(() => {
  "use strict";

  function createImportPreview({
    $,
    state,
    selectImportRows,
    esc,
    openModal,
    modules,
  }) {
    const { renderImportCorrections } = modules.correctionView.create({
      $,
      state,
      esc,
    });
    const { renderImportPreview, updateImportCommitButton } =
      modules.rendering.create({
        $,
        state,
        selectImportRows,
        esc,
        renderImportCorrections,
      });

    function validateImportStage(rows, total, errors) {
      if (total > 500) {
        throw new Error(
          "Imports are limited to 500 rows at a time. Split the CSV and review each batch.",
        );
      }
      if (!rows.length && !errors.length) {
        throw new Error("The CSV file has no importable rows.");
      }
    }

    function pendingImportFor(title, rows, commit, note, report) {
      const total = Number(report.total ?? rows.length);
      const errors = report.errors || [];
      validateImportStage(rows, total, errors);
      return {
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
    }

    function stageImport(title, rows, commit, note = "", report = {}) {
      state.pendingImport = pendingImportFor(title, rows, commit, note, report);
      $("import-include-duplicates").checked = false;
      renderImportPreview();
      openModal("import-preview-modal");
    }

    return Object.freeze({
      stageImport,
      renderImportPreview,
      updateImportCommitButton,
    });
  }

  window.PropertyDeskImportPreview = Object.freeze({
    create: createImportPreview,
  });
})();
