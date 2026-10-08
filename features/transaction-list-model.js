/* Build filtered transaction rows from the current workspace records. */
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
    const associationModel =
      window.PropertyDeskTransactionAssociationModel.create({ state });

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
