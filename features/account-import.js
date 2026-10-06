/* CSV account import review and commit workflow. */
(() => {
  "use strict";

  function createAccountImport(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      todayIso,
      buildPayloads = window.PropertyDeskAccountImportPayload.build,
      commitAccounts,
    } = context;

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
            const payload = buildPayloads(rowsToImport);
            await commitAccounts({
              rows: payload,
              sourceName: file.name,
              total: review.total,
            });
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

    function attachEvents() {
      $("import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) return importAccounts(event.target.files[0]);
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskAccountImport = Object.freeze({
    create: createAccountImport,
  });
})();
