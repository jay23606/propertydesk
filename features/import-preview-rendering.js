/* Render staged CSV rows, validation corrections, and the commit button. */
(() => {
  "use strict";

  function createImportPreviewRendering({ $, state, selectImportRows, esc }) {
    function renderCorrectionCell(error, raw, key) {
      const content =
        raw && !raw._parse_error
          ? `<input type="text" data-import-correction data-row="${Number(error.row)}" data-column="${esc(key)}" aria-label="CSV row ${Number(error.row)} ${esc(key)}" value="${esc(raw[key] ?? "")}">`
          : esc(raw?.[key] ?? "");
      return `<td>${content}</td>`;
    }

    function renderImportPreview() {
      const pending = state.pendingImport;
      if (!pending) return;

      const { rows, errors, total, note } = pending;
      const duplicateCount = rows.filter(
        (row) => row._possible_duplicate,
      ).length;
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

      const keys = [
        ...new Set(
          rows.flatMap((row) =>
            Object.keys(row).filter(
              (key) => !["_possible_duplicate", "_source_row"].includes(key),
            ),
          ),
        ),
      ];
      if (duplicateCount || errors.length) keys.unshift("source_row");
      if (duplicateCount) keys.push("review_status");
      $("import-preview-head").innerHTML = keys.length
        ? `<tr>${keys.map((key) => `<th>${esc(key.replaceAll("_", " "))}</th>`).join("")}</tr>`
        : "";
      $("import-preview-body").innerHTML = rows
        .map(
          (row) =>
            `<tr class="${row._possible_duplicate ? "duplicate-import-row" : ""}">${keys
              .map(
                (key) =>
                  `<td>${esc(key === "review_status" ? (row._possible_duplicate ? "Possible duplicate — skipped" : "New row") : key === "source_row" ? row._source_row : (row[key] ?? ""))}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");

      $("import-preview-errors").classList.toggle(
        "hidden",
        errors.length === 0,
      );
      $("import-preview-error-summary").textContent = errors.length
        ? "Correct the editable cells below; corrected rows are revalidated immediately and become eligible for import. Rows with malformed CSV structure must be fixed in the source file."
        : "";

      const rawKeys = [
        ...new Set([
          ...pending.correctionKeys,
          ...pending.rawRows.flatMap((row) => Object.keys(row)),
        ]),
      ];
      $("import-correction-head").innerHTML = rawKeys.length
        ? `<tr><th>CSV ROW</th>${rawKeys.map((key) => `<th>${esc(key.replaceAll("_", " "))}</th>`).join("")}<th>VALIDATION</th></tr>`
        : "";
      $("import-correction-body").innerHTML = errors
        .map((error) => {
          const raw = pending.rawRows.find(
            (row) => Number(row._source_row) === Number(error.row),
          );
          const cells = rawKeys
            .map((key) => renderCorrectionCell(error, raw, key))
            .join("");
          return `<tr><td>${Number(error.row)}</td>${cells}<td>${esc(error.message)}</td></tr>`;
        })
        .join("");
      $("import-correction-table").classList.toggle(
        "hidden",
        errors.length === 0 || rawKeys.length === 0,
      );
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
      $("import-commit").disabled = count === 0 || Boolean(pending?.commitUnconfirmed);
    }

    return { renderImportPreview, updateImportCommitButton };
  }

  window.PropertyDeskImportPreviewRendering = Object.freeze({ create: createImportPreviewRendering });
})();
