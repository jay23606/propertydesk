/* Project associated transaction records into the fields safe for display. */
(() => {
  "use strict";

  function createTransactionDisplayRowModel({ expenseCategoryLabel }) {
    function displayFields(row) {
      const { account, item } = row;
      if (row.kind === "expense") {
        return {
          transactionType: "Expense",
          detailsType: expenseCategoryLabel(item.category),
          paymentMethod: item.payee || item.payment_method,
          correctionOf: item.correction_of_expense_id,
        };
      }

      return {
        transactionType:
          item.income_category === "deposit" ? "Security deposit" : "Income",
        detailsType:
          account?.account_type === "rental"
            ? item.income_category
            : "Installment receipt",
        paymentMethod: item.payment_method.replace("_", " "),
        correctionOf: item.correction_of_payment_id,
      };
    }

    function toDisplayRow(row) {
      const { account, property } = row;
      const item = row.item;
      return {
        kind: row.kind,
        date: row.date,
        amount: row.amount,
        item: {
          id: item.id,
          status: item.status,
          memo: item.memo,
          void_reason: item.void_reason,
        },
        propertyName: property?.name || "—",
        partyName: account?.party_name || account?.name || "Property",
        ...displayFields(row),
      };
    }

    return Object.freeze({ toDisplayRow });
  }

  window.PropertyDeskTransactionDisplayRowModel = Object.freeze({
    create: createTransactionDisplayRowModel,
  });
})();
