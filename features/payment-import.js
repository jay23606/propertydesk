/* CSV payment import review and commit workflow. */
(() => {
  "use strict";

  function createPaymentImport(context) {
    const {
      $,
      state,
      stageImport,
      parseCSV,
      validatePaymentRows,
      commitTransactions,
    } = context;

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
            await commitTransactions({
              kind: "payments",
              rows: rowsToInsert,
              sourceName: file.name,
              total: review.total,
              label: "payment",
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
      $("payment-import-file").addEventListener("change", (event) => {
        if (event.target.files[0]) return importPayments(event.target.files[0]);
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskPaymentImport = Object.freeze({
    create: createPaymentImport,
  });
})();
