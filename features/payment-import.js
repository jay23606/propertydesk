/* CSV payment import review and row-mapping workflow. */
(() => {
  "use strict";

  function createPaymentImport(context) {
    const {
      $,
      state,
      parseCSV,
      validatePaymentRows,
      transactionImportReview,
      createFileWorkflow,
    } = context;

    const fileWorkflow = createFileWorkflow({
      input: $("payment-import-file"),
      status: $("import-status"),
      parseCSV,
      emptyMessage: "The CSV file has no payment rows.",
      failurePrefix: "Payment import needs review: ",
      handleRows(file, rows) {
        const validateRows = (sourceRows) =>
          validatePaymentRows(
            sourceRows,
            state.properties,
            state.accounts,
            state.payments,
          );
        transactionImportReview.stage({
          title: "Review payment import",
          rows,
          validateRows,
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
          file,
          kind: "payments",
          label: "payment",
          mapRows(rowsToImport) {
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
            return rowsToInsert;
          },
        });
      },
    });

    return fileWorkflow;
  }

  window.PropertyDeskPaymentImport = Object.freeze({
    create: createPaymentImport,
  });
})();
