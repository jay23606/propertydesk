/* Render editable CSV rows that failed validation. */
(() => {
  "use strict";

  function createImportCorrectionView({ $, state, esc }) {
    function renderCorrectionCell(error, raw, key) {
      const content =
        raw && !raw._parse_error
          ? `<input type="text" data-import-correction data-row="${Number(error.row)}" data-column="${esc(key)}" aria-label="CSV row ${Number(error.row)} ${esc(key)}" value="${esc(raw[key] ?? "")}">`
          : esc(raw?.[key] ?? "");
      return `<td>${content}</td>`;
    }

    function renderImportCorrections() {
      const pending = state.pendingImport;
      if (!pending) return;

      const { errors } = pending;
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
    }

    return Object.freeze({ renderImportCorrections });
  }

  window.PropertyDeskImportCorrectionView = Object.freeze({
    create: createImportCorrectionView,
  });
})();
