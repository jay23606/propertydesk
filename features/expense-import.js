/* CSV expense import review and row-mapping workflow. */
(() => {
  "use strict";

  function createExpenseImport(context) {
    const {
      $,
      state,
      parseCSV,
      validateExpenseRows,
      commitTransactions,
      importReview,
      references = window.PropertyDeskImportReferences.create(),
      createFileWorkflow,
    } = context;

    const fileWorkflow = createFileWorkflow({
      input: $("expense-import-file"),
      status: $("import-status"),
      parseCSV,
      emptyMessage: "The CSV file has no expense rows.",
      failurePrefix: "Import needs review: ",
      handleRows(file, rows) {
        const validateRows = (sourceRows) =>
          validateExpenseRows(
            sourceRows,
            state.properties,
            state.accounts,
            state.expenses,
          );
        importReview.stage({
          title: "Review expense import",
          rows,
          validateRows,
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
          file,
          mapRows(rowsToImport) {
            return rowsToImport.map((row) => {
              const property = references.findProperty(
                state.properties,
                row.property_name,
                row.property_address,
              );
              if (!property) {
                throw new Error(
                  `Property ${row.property_name} at ${row.property_address} is no longer available. Reload and select the CSV again.`,
                );
              }
              const account = row.account_name
                ? references.findAccount(
                    state.accounts,
                    property.id,
                    row.account_name,
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
          },
          commit({ rows: payload, file: sourceFile, total }) {
            return commitTransactions({
              kind: "expenses",
              rows: payload,
              sourceName: sourceFile.name,
              total,
              label: "expense",
            });
          },
        });
      },
    });

    return fileWorkflow;
  }

  window.PropertyDeskExpenseImport = Object.freeze({
    create: createExpenseImport,
  });
})();
