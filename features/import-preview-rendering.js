/* Render preview summary and correction state around the staged CSV table. */
(() => {
  "use strict";

  function commitButtonState(pending, count) {
    let textContent;
    if (pending?.commitUnconfirmed) textContent = "Reload to check status";
    else if (count)
      textContent = `Import ${count} row${count === 1 ? "" : "s"}`;
    else textContent = "No valid rows to import";

    return {
      textContent,
      disabled: count === 0 || Boolean(pending?.commitUnconfirmed),
    };
  }

  function createImportPreviewRendering({
    $,
    state,
    selectImportRows,
    esc,
    renderImportCorrections,
  }) {
    const { renderPreviewTable } = window.PropertyDeskImportPreviewTable.create(
      { $, esc },
    );

    function renderSummary(pending, duplicateCount) {
      const { rows, errors, total, note } = pending;
      $("import-preview-title").textContent = pending.title;
      const rowCount = `${total} CSV row${total === 1 ? "" : "s"}`;
      const validCount = `${rows.length} valid`;
      const errorCount = errors.length
        ? ` · ${errors.length} need correction`
        : "";
      const duplicateSummary = duplicateCount
        ? ` · ${duplicateCount} possible duplicate${duplicateCount === 1 ? "" : "s"} excluded by default`
        : "";
      const noteSummary = note ? ` · ${note}` : "";
      $("import-preview-summary").textContent =
        `${rowCount} · ${validCount}${errorCount}${duplicateSummary}${noteSummary}`;
      $("import-include-duplicates-wrap").classList.toggle(
        "hidden",
        duplicateCount === 0,
      );
    }

    function renderCorrectionNotice(errors) {
      $("import-preview-errors").classList.toggle(
        "hidden",
        errors.length === 0,
      );
      $("import-preview-error-summary").textContent = errors.length
        ? "Correct the editable cells below; corrected rows are revalidated immediately and become eligible for import. Rows with malformed CSV structure must be fixed in the source file."
        : "";
    }

    function renderImportPreview() {
      const pending = state.pendingImport;
      if (!pending) return;

      const { rows, errors } = pending;
      const duplicateCount = rows.filter(
        (row) => row._possible_duplicate,
      ).length;
      renderSummary(pending, duplicateCount);
      renderPreviewTable(rows, duplicateCount, errors.length);
      renderCorrectionNotice(errors);

      renderImportCorrections();
      updateImportCommitButton();
    }

    function updateImportCommitButton() {
      const pending = state.pendingImport;
      const selected = selectImportRows(
        pending?.rows || [],
        $("import-include-duplicates").checked,
      );
      const buttonState = commitButtonState(pending, selected.length);
      $("import-commit").textContent = buttonState.textContent;
      $("import-commit").disabled = buttonState.disabled;
    }

    return Object.freeze({ renderImportPreview, updateImportCommitButton });
  }

  window.PropertyDeskImportPreviewRendering = Object.freeze({
    create: createImportPreviewRendering,
  });
})();
