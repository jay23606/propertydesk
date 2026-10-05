/* PropertyDesk CSV import review and commit workflows. */
(() => {
  "use strict";

  function createImportWorkflows(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      validateAccountRows,
      validateExpenseRows,
      validatePaymentRows,
      todayIso,
      fetchAll,
      toast,
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
