/* CSV expense import review and row-mapping workflow. */
(() => {
  "use strict";

  function currentExpenseProperty(row, lookup) {
    const property = lookup.findExactProperty(
      row.property_name,
      row.property_address,
    );
    if (!property) {
      throw new Error(
        `Property ${row.property_name} at ${row.property_address} is no longer available. Reload and select the CSV again.`,
      );
    }
    return property;
  }

  function currentExpenseAccount(row, property, lookup) {
    if (!row.account_name) return null;

    const account = lookup.findExactAccount(property.id, row.account_name);
    if (row.account_name && !account) {
      throw new Error(
        `Account ${row.account_name} is no longer available at ${row.property_name}. Reload and select the CSV again.`,
      );
    }
    return account;
  }

  function mapExpenseRow(row, lookup) {
    const property = currentExpenseProperty(row, lookup);
    const account = currentExpenseAccount(row, property, lookup);
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
  }

  function createExpenseImport({
    $,
    state,
    parseCSV,
    validateExpenseRows,
    commitTransactions,
    importReview,
    createImportLookup,
    createFileWorkflow,
    createTransactionImportWorkflow,
  }) {
    return createTransactionImportWorkflow({
      $,
      parseCSV,
      importReview,
      createFileWorkflow,
      inputId: "expense-import-file",
      emptyMessage: "The CSV file has no expense rows.",
      failurePrefix: "Import needs review: ",
      title: "Review expense import",
      validateRows: (sourceRows) =>
        validateExpenseRows(
          sourceRows,
          state.properties,
          state.accounts,
          state.expenses,
        ),
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
      mapRows(rowsToImport) {
        const lookup = createImportLookup(state.properties, state.accounts);
        return rowsToImport.map((row) => mapExpenseRow(row, lookup));
      },
      commitTransactions,
      kind: "expenses",
      label: "expense",
    });
  }

  window.PropertyDeskExpenseImport = Object.freeze({
    create: createExpenseImport,
  });
})();
