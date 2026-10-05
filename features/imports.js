/* PropertyDesk CSV import review and commit workflows. */
(() => {
  "use strict";

  function createImportWorkflows(context) {
    const {
      $,
      state,
      parseCSV,
      selectImportRows,
      validateAccountRows,
      validateExpenseRows,
      validatePaymentRows,
      esc,
      todayIso,
      openModal,
      closeModal,
      fetchAll,
      toast,
    } = context;

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
      const content = raw && !raw._parse_error
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
      $("import-commit").textContent = count
        ? `Import ${count} row${count === 1 ? "" : "s"}`
        : "No valid rows to import";
      $("import-commit").disabled = count === 0;
    }

    async function importAccounts(file) {
      const status = $("import-status");
      status.textContent = "";
      status.classList.remove("success");
      try {
        const rows = parseCSV(await file.text());
        if (!rows.length) throw new Error("The CSV file has no account rows.");
        const validateRows = (sourceRows) =>
          validateAccountRows(
            sourceRows,
            state.properties,
            state.accounts,
            todayIso(),
          );
        const validation = validateRows(rows);
        stageImport(
          "Review account import",
          validation.valid,
          async (rowsToImport, review) => {
            const payload = rowsToImport.map((row) => ({
              property_name: row.property_name,
              property_address: row.property_address,
              city: row.city,
              state: row.state,
              postal_code: row.postal_code,
              property_kind: row.property_kind,
              account_type: row.account_type,
              account_name: row.account_name,
              party_name: row.party_name || null,
              party_email: row.party_email || null,
              party_phone: row.party_phone || null,
              start_date: row.start_date,
              next_due_date: row.next_due_date || null,
              payment_amount: row.payment_amount,
              payment_frequency: row.payment_frequency,
              original_principal: row.original_principal,
              principal_interest_amount: row.principal_interest_amount,
              escrow_amount: row.escrow_amount,
              ledger_opening_balance: row.ledger_opening_balance,
              ledger_opening_date: row.ledger_opening_date || null,
              interest_rate: row.interest_rate,
              term_months: row.term_months ? Number(row.term_months) : null,
              balloon_date: row.balloon_date || null,
              late_fee: row.late_fee,
              grace_days: row.grace_days,
              notes: row.notes || null,
            }));
            const { data, error } = await state.client.rpc(
              "pd_import_propertydesk_accounts",
              {
                p_rows: payload,
                p_source_name: file.name,
                p_rows_total: review.total,
              },
            );
            if (error) throw error;
            await fetchAll();
            const imported = Number(data?.rows_accepted ?? payload.length);
            const rejected = review.total - imported;
            status.textContent = `Imported ${imported} account${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
            status.classList.add("success");
            toast("Import complete");
          },
          "",
          {
            total: validation.total,
            errors: validation.errors,
            rawRows: rows,
            correctionKeys: [
              "property_name",
              "property_address",
              "city",
              "state",
              "postal_code",
              "property_kind",
              "account_type",
              "account_name",
              "party_name",
              "party_email",
              "party_phone",
              "start_date",
              "next_due_date",
              "payment_amount",
              "payment_frequency",
              "original_principal",
              "principal_interest_amount",
              "escrow_amount",
              "ledger_opening_balance",
              "ledger_opening_date",
              "interest_rate",
              "term_months",
              "balloon_date",
              "late_fee",
              "grace_days",
              "notes",
            ],
            revalidate: validateRows,
          },
        );
      } catch (error) {
        status.textContent = `Import failed: ${error.message}`;
      }
      $("import-file").value = "";
    }

    async function importExpenses(file) {
      const status = $("import-status");
      status.textContent = "";
      status.classList.remove("success");
      try {
        const rows = parseCSV(await file.text());
        if (!rows.length) throw new Error("The CSV file has no expense rows.");
        const validateRows = (sourceRows) =>
          validateExpenseRows(
            sourceRows,
            state.properties,
            state.accounts,
            state.expenses,
          );
        const validation = validateRows(rows);
        stageImport(
          "Review expense import",
          validation.valid,
          async (rowsToImport, review) => {
            const payload = rowsToImport.map((row) => {
              const property = state.properties.find(
                (item) =>
                  item.name === row.property_name &&
                  item.address === row.property_address,
              );
              if (!property) {
                throw new Error(
                  `Property ${row.property_name} at ${row.property_address} is no longer available. Reload and select the CSV again.`,
                );
              }
              const account = row.account_name
                ? state.accounts.find(
                    (item) =>
                      item.property_id === property.id &&
                      item.name === row.account_name,
                  )
                : null;
              if (row.account_name && !account) {
                throw new Error(
                  `Account ${row.account_name} is no longer available at ${row.property_name}. Reload and select the CSV again.`,
                );
              }
              return {
                property_id: property.id,
                account_id: account?.id || null,
                expense_date: row.expense_date,
                amount: row.amount,
                category: row.category,
                payee: row.payee || null,
                payment_method: row.payment_method,
                memo: row.memo || null,
              };
            });
            const { data, error } = await state.client.rpc(
              "pd_import_propertydesk_transactions",
              {
                p_kind: "expenses",
                p_rows: payload,
                p_source_name: file.name,
                p_rows_total: review.total,
              },
            );
            if (error) throw error;
            await fetchAll();
            const imported = Number(data?.rows_accepted ?? payload.length);
            const rejected = review.total - imported;
            status.textContent = `Imported ${imported} expense${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
            status.classList.add("success");
            toast("Expense import complete");
          },
          "",
          {
            total: validation.total,
            errors: validation.errors,
            rawRows: rows,
            correctionKeys: [
              "property_name",
              "property_address",
              "account_name",
              "expense_date",
              "amount",
              "category",
              "payee",
              "payment_method",
              "memo",
              "source_note",
            ],
            revalidate: validateRows,
          },
        );
      } catch (error) {
        status.textContent = `Import needs review: ${error.message}`;
      }
      $("expense-import-file").value = "";
    }

    async function importPayments(file) {
      const status = $("import-status");
      status.textContent = "";
      status.classList.remove("success");
      try {
        const rows = parseCSV(await file.text());
        if (!rows.length) throw new Error("The CSV file has no payment rows.");
        const validateRows = (sourceRows) =>
          validatePaymentRows(
            sourceRows,
            state.properties,
            state.accounts,
            state.payments,
          );
        const validation = validateRows(rows);
        stageImport(
          "Review payment import",
          validation.valid,
          async (rowsToImport, review) => {
            const rowsToInsert = rowsToImport.map((row) => ({
              account_id: state.accounts.find(
                (account) =>
                  account.name === row.account_name &&
                  state.properties.find(
                    (property) => property.id === account.property_id,
                  )?.name === row.property_name &&
                  state.properties.find(
                    (property) => property.id === account.property_id,
                  )?.address === row.property_address,
              )?.id,
              received_date: row.received_date,
              amount: row.amount,
              income_category: row.income_category,
              payment_method: row.payment_method,
              principal_amount: row.principal_amount,
              interest_amount: row.interest_amount,
              fee_amount: row.fee_amount,
              escrow_amount: row.escrow_amount,
              unapplied_amount: row.unapplied_amount,
              memo: row.memo || null,
            }));
            if (rowsToInsert.some((row) => !row.account_id)) {
              throw new Error(
                "An account is no longer available for one or more payments. Reload and select the CSV again.",
              );
            }
            const { data, error } = await state.client.rpc(
              "pd_import_propertydesk_transactions",
              {
                p_kind: "payments",
                p_rows: rowsToInsert,
                p_source_name: file.name,
                p_rows_total: review.total,
              },
            );
            if (error) throw error;
            await fetchAll();
            const imported = Number(data?.rows_accepted ?? rowsToInsert.length);
            const rejected = review.total - imported;
            status.textContent = `Imported ${imported} payment${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
            status.classList.add("success");
            toast("Payment import complete");
          },
          "",
          {
            total: validation.total,
            errors: validation.errors,
            rawRows: rows,
            correctionKeys: [
              "property_name",
              "property_address",
              "account_name",
              "received_date",
              "amount",
              "income_category",
              "payment_method",
              "principal_amount",
              "interest_amount",
              "fee_amount",
              "escrow_amount",
              "unapplied_amount",
              "memo",
            ],
            revalidate: validateRows,
          },
        );
      } catch (error) {
        status.textContent = `Payment import needs review: ${error.message}`;
      }
      $("payment-import-file").value = "";
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
          closeModal($("import-preview-modal"));
        } catch (error) {
          $("import-preview-summary").textContent =
            `Import failed; no rows were committed. ${error.message}`;
          updateImportCommitButton();
        } finally {
          updateImportCommitButton();
        }
      });

      $("import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) importAccounts(event.target.files[0]);
      });
      $("payment-import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) importPayments(event.target.files[0]);
      });
      $("expense-import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) importExpenses(event.target.files[0]);
      });
    }

    return { attachEvents, importAccounts, importExpenses, importPayments };
  }

  window.PropertyDeskImportFeature = Object.freeze({
    create: createImportWorkflows,
  });
})();
