/* Render staged CSV rows as an escaped HTML table. */
(() => {
  "use strict";

  function createImportPreviewTable({ $, esc }) {
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

    function renderPreviewTable(rows, duplicateCount, errorCount) {
      const keys = previewColumns(rows, duplicateCount, errorCount);
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

    return Object.freeze({ renderPreviewTable });
  }

  window.PropertyDeskImportPreviewTable = Object.freeze({
    create: createImportPreviewTable,
  });
})();
