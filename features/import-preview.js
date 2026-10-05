/* Review staged CSV imports, correct invalid rows, and commit approved batches. */
(() => {
  "use strict";

  function createImportPreview(context) {
    const { $, state, selectImportRows, esc, openModal, closeModal, toast } =
      context;

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

    return { stageImport, attachEvents };
  }

  window.PropertyDeskImportPreview = Object.freeze({ create: createImportPreview });
})();
