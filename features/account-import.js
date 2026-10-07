/* CSV account import review and row-mapping workflow. */
(() => {
  "use strict";

  function createAccountImport(context) {
    const {
      $,
      state,
      parseCSV,
      validateAccountRows,
      todayIso,
      buildPayloads,
      commitAccounts,
      importReview,
      createFileWorkflow,
    } = context;

    const fileWorkflow = createFileWorkflow({
      input: $("import-file"),
      status: $("import-status"),
      parseCSV,
      emptyMessage: "The CSV file has no account rows.",
      failurePrefix: "Import failed: ",
      handleRows(file, rows) {
        const validateRows = (sourceRows) =>
          validateAccountRows(
            sourceRows,
            state.properties,
            state.accounts,
            todayIso(),
          );
        importReview.stage({
          title: "Review account import",
          rows,
          validateRows,
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
          file,
          mapRows: buildPayloads,
          commit({ rows: payload, file: sourceFile, total }) {
            return commitAccounts({
              rows: payload,
              sourceName: sourceFile.name,
              total,
            });
          },
        });
      },
    });

    return fileWorkflow;
  }

  window.PropertyDeskAccountImport = Object.freeze({
    create: createAccountImport,
  });
})();
