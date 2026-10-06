/* Render staged CSV rows and update the import commit control. */
(() => {
  "use strict";

  function createImportPreviewRendering({
    $,
    state,
    selectImportRows,
    esc,
    renderImportCorrections,
  }) {
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

    function previewColumns(rows, duplicateCount, errorCount) {
      const keys = [
        ...new Set(
          rows.flatMap((row) =>
            Object.keys(row).filter(
              (key) => !["_possible_duplicate", "_source_row"].includes(key),
            ),
          ),
        ),
      ];
      if (duplicateCount || errorCount) keys.unshift("source_row");
      if (duplicateCount) keys.push("review_status");
      return keys;
    }

    function previewCellValue(row, key) {
      if (key === "review_status")
        return row._possible_duplicate
          ? "Possible duplicate — skipped"
          : "New row";
      if (key === "source_row") return row._source_row;
      return row[key] ?? "";
    }

    function renderPreviewTable(rows, keys) {
      $("import-preview-head").innerHTML = keys.length
        ? `<tr>${keys.map((key) => `<th>${esc(key.replaceAll("_", " "))}</th>`).join("")}</tr>`
        : "";
      $("import-preview-body").innerHTML = rows
        .map((row) => {
          const rowClass = row._possible_duplicate
            ? "duplicate-import-row"
            : "";
          const cells = keys
            .map((key) => `<td>${esc(previewCellValue(row, key))}</td>`)
            .join("");
          return `<tr class="${rowClass}">${cells}</tr>`;
        })
        .join("");
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
      renderPreviewTable(
        rows,
        previewColumns(rows, duplicateCount, errors.length),
      );
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
      const count = selected.length;
      $("import-commit").textContent = pending?.commitUnconfirmed
        ? "Reload to check status"
        : count
          ? `Import ${count} row${count === 1 ? "" : "s"}`
          : "No valid rows to import";
      $("import-commit").disabled =
        count === 0 || Boolean(pending?.commitUnconfirmed);
    }

    return { renderImportPreview, updateImportCommitButton };
  }

  window.PropertyDeskImportPreviewRendering = Object.freeze({
    create: createImportPreviewRendering,
  });
})();
