/* CSV account import review and commit workflow. */
(() => {
  "use strict";

  function createAccountImport(context) {
    const {
      $, state, stageImport, parseCSV, validateAccountRows,
      todayIso, fetchAll, toast,
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

    function attachEvents() {
      $("import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) importAccounts(event.target.files[0]);
      });
    }

    return { importAccounts, attachEvents };
  }

  window.PropertyDeskAccountImport = Object.freeze({ create: createAccountImport });
})();
