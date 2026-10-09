/* Build filtered transaction rows from the current workspace records. */
(() => {
  "use strict";

  function createTransactionListModel({
    getPayments,
    getExpenses,
    associationModel,
    displayRowModel,
    filterModel,
  }) {
    function buildTransactionList(filters) {
      const rows = [
        ...getPayments().map((item) => ({
          kind: "income",
          date: item.received_date,
          amount: Number(item.amount),
          item,
        })),
        ...getExpenses().map((item) => ({
          kind: "expense",
          date: item.expense_date,
          amount: Number(item.amount),
          item,
        })),
      ].map(associationModel.associateTransaction);
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
