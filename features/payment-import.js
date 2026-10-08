/* CSV payment import review and row-mapping workflow. */
(() => {
  "use strict";

  function mapPaymentRows(rowsToImport, state, createImportLookup) {
    const lookup = createImportLookup(state.properties, state.accounts);
    const rowsToInsert = rowsToImport.map((row) => ({
      account_id: lookup.findExactAccount(
        lookup.findExactProperty(row.property_name, row.property_address)?.id,
        row.account_name,
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
    return rowsToInsert;
  }

  function createPaymentImport({
    $,
    state,
    parseCSV,
    validatePaymentRows,
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
      inputId: "payment-import-file",
      emptyMessage: "The CSV file has no payment rows.",
      failurePrefix: "Payment import needs review: ",
      title: "Review payment import",
      validateRows: (sourceRows) =>
        validatePaymentRows(
          sourceRows,
          state.properties,
          state.accounts,
          state.payments,
        ),
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
      mapRows: (rowsToImport) =>
        mapPaymentRows(rowsToImport, state, createImportLookup),
      commitTransactions,
      kind: "payments",
      label: "payment",
    });
  }

  window.PropertyDeskPaymentImport = Object.freeze({
    create: createPaymentImport,
  });
})();
