/* Filter transactions, resolve associations, and summarize current-month totals. */
(() => {
  "use strict";

  function createTransactionListModel({
    state,
    expenseCategoryLabel,
    filterModel,
  }) {
    const displayRowModel =
      window.PropertyDeskTransactionDisplayRowModel.create({
        expenseCategoryLabel,
      });

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
      return filterModel
        .filterRows(rows, filters)
        .map(displayRowModel.toDisplayRow);
    }

    return Object.freeze({ buildTransactionList });
  }

  window.PropertyDeskTransactionListModel = Object.freeze({
    create: createTransactionListModel,
  });
})();
