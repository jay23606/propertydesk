/* Coordinate transaction filters, summary totals, and view rendering. */
(() => {
  "use strict";

  function createTransactionViews(context) {
    const {
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses,
    } = context;
    const { buildTransactionList } =
      window.PropertyDeskTransactionListModel.create({
        state, dateOnly, expenseCategoryLabel, isPosted, monthStart,
        sumIncome, sumOperatingExpenses,
      });
    const { transactionRowHTML } = window.PropertyDeskTransactionRowView.create({
      esc, money, fmtDate,
    });

    function attachEvents() {
      $("payment-search").addEventListener("input", renderPayments);
      $("payment-period").addEventListener("change", renderPayments);
      $("transaction-type").addEventListener("change", renderPayments);
    }

    function renderPayments() {
      const result = buildTransactionList({
        period: $("payment-period").value,
        query: $("payment-search").value,
        type: $("transaction-type").value,
      });
      $("payments-table").innerHTML = result.rows
        .map(transactionRowHTML)
        .join("");
      $("payments-empty").classList.toggle("hidden", result.rows.length > 0);
      if (!result.rows.length) {
        $("payments-empty").textContent = "No transactions match this view.";
      }
      $("payments-collected").textContent = money(result.totals.collected);
      $("expenses-total").textContent = money(result.totals.expenses);
      $("net-cash-flow").textContent = money(result.totals.netCashFlow);
    }

    return { renderPayments, attachEvents };
  }

  window.PropertyDeskTransactionViews = Object.freeze({
    create: createTransactionViews,
  });
})();
