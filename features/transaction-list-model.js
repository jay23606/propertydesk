/* Filter transactions, resolve associations, and summarize current-month totals. */
(() => {
  "use strict";

  function createTransactionListModel({
    state,
    dateOnly,
    expenseCategoryLabel,
    isPosted,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
  }) {
    function buildTransactionList({ period, query, type, now = new Date() }) {
      const normalizedQuery = query.trim().toLowerCase();
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
        .filter((row) => {
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
          return (
            !normalizedQuery ||
            `${account?.name || ""} ${account?.party_name || ""} ${property?.name || ""} ${row.item.memo || ""} ${row.item.payee || ""}`
              .toLowerCase()
              .includes(normalizedQuery)
          );
        })
        .sort((left, right) =>
          String(right.date).localeCompare(String(left.date)),
        )
        .map((row) => {
          const item = row.item;
          const isExpense = row.kind === "expense";
          const account = state.accounts.find(
            (candidate) => candidate.id === item.account_id,
          );
          const property = isExpense
            ? state.properties.find(
                (candidate) => candidate.id === item.property_id,
              )
            : state.properties.find(
                (candidate) => candidate.id === account?.property_id,
              );
          return {
            ...row,
            propertyName: property?.name || "—",
            partyName: account?.party_name || account?.name || "Property",
            transactionType: isExpense
              ? "Expense"
              : item.income_category === "deposit"
                ? "Security deposit"
                : "Income",
            detailsType: isExpense
              ? expenseCategoryLabel(item.category)
              : account?.account_type === "rental"
                ? item.income_category
                : "Installment receipt",
            paymentMethod: isExpense
              ? item.payee || item.payment_method
              : item.payment_method.replace("_", " "),
            correctionOf: isExpense
              ? item.correction_of_expense_id
              : item.correction_of_payment_id,
          };
        });
      const currentMonthStart = monthStart();
      const monthPayments = state.payments.filter(
        (payment) =>
          isPosted(payment) &&
          String(payment.received_date) >= currentMonthStart,
      );
      const monthExpenses = state.expenses.filter(
        (expense) =>
          String(expense.expense_date) >= currentMonthStart &&
          isPosted(expense),
      );
      const collected = sumIncome(monthPayments);
      const expenses = sumOperatingExpenses(monthExpenses);

      return {
        rows,
        totals: { collected, expenses, netCashFlow: collected - expenses },
      };
    }

    return { buildTransactionList };
  }

  window.PropertyDeskTransactionListModel = Object.freeze({
    create: createTransactionListModel,
  });
})();
