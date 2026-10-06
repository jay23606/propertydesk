/* CSV expense import review and commit workflow. */
(() => {
  "use strict";

  function createExpenseImport(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      validateExpenseRows,
      commitTransactions,
    } = context;

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
            await commitTransactions({
              kind: "expenses",
              rows: payload,
              sourceName: file.name,
              total: review.total,
              label: "expense",
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

    function attachEvents() {
      $("expense-import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) return importExpenses(event.target.files[0]);
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskExpenseImport = Object.freeze({
    create: createExpenseImport,
  });
})();
