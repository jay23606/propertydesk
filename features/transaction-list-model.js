/* Filter transactions, resolve associations, and summarize current-month totals. */
(() => {
  "use strict";

  function createTransactionListModel({
    state,
    expenseCategoryLabel,
    filterModel,
  }) {
    function findTransactionProperty(row, account) {
      const propertyId =
        row.kind === "expense" ? row.item.property_id : account?.property_id;
      return state.properties.find((candidate) => candidate.id === propertyId);
    }

    function searchField(value) {
      return value || "";
    }

    function transactionSearchText(row, account, property) {
      return [
        account?.name,
        account?.party_name,
        property?.name,
        row.item.memo,
        row.item.payee,
      ]
        .map(searchField)
        .join(" ")
        .toLowerCase();
    }

    function associateTransaction(row) {
      const account = state.accounts.find(
        (candidate) => candidate.id === row.item.account_id,
      );
      const property = findTransactionProperty(row, account);
      return {
        kind: row.kind,
        date: row.date,
        amount: row.amount,
        item: row.item,
        account,
        property,
        searchText: transactionSearchText(row, account, property),
      };
    }

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

    function buildTransactionList(filters) {
      const rows = [
        ...state.payments.map((item) => ({
          kind: "income",
          date: item.received_date,
          amount: Number(item.amount),
          item,
        })),
        ...state.expenses.map((item) => ({
          kind: "expense",
          date: item.expense_date,
          amount: Number(item.amount),
          item,
        })),
      ].map(associateTransaction);
      return filterModel.filterRows(rows, filters).map(toDisplayRow);
    }

    return Object.freeze({ buildTransactionList });
  }

  window.PropertyDeskTransactionListModel = Object.freeze({
    create: createTransactionListModel,
  });
})();
