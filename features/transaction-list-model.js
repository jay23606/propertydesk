/* Filter transactions, resolve associations, and summarize current-month totals. */
(() => {
  "use strict";

  function createTransactionListModel({
    state,
    dateOnly,
    expenseCategoryLabel,
  }) {
    function associateTransaction(row) {
      const account = state.accounts.find(
        (candidate) => candidate.id === row.item.account_id,
      );
      const property =
        row.kind === "expense"
          ? state.properties.find(
              (candidate) => candidate.id === row.item.property_id,
            )
          : state.properties.find(
              (candidate) => candidate.id === account?.property_id,
            );
      return {
        ...row,
        account,
        property,
        searchText:
          `${account?.name || ""} ${account?.party_name || ""} ${property?.name || ""} ${row.item.memo || ""} ${row.item.payee || ""}`.toLowerCase(),
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
        item,
        propertyName: property?.name || "—",
        partyName: account?.party_name || account?.name || "Property",
        ...displayFields(row),
      };
    }

    function buildRows({ period, query, type, now = new Date() }) {
      const normalizedQuery = query.trim().toLowerCase();
      return [
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
      ]
        .filter((row) => {
          const date = dateOnly(row.date);
          return (
            (type === "all" || type === row.kind) &&
            (period === "all" ||
              (period === "month" &&
                date?.getMonth() === now.getMonth() &&
                date?.getFullYear() === now.getFullYear()) ||
              (period === "year" && date?.getFullYear() === now.getFullYear()))
          );
        })
        .map(associateTransaction)
        .filter(
          (row) => !normalizedQuery || row.searchText.includes(normalizedQuery),
        )
        .sort((left, right) =>
          String(right.date).localeCompare(String(left.date)),
        )
        .map(toDisplayRow);
    }

    function buildTransactionList(filters) {
      return buildRows(filters);
    }

    return { buildTransactionList };
  }

  window.PropertyDeskTransactionListModel = Object.freeze({
    create: createTransactionListModel,
  });
})();
