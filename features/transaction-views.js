/* Coordinate transaction filters, summary totals, and view rendering. */
(() => {
  "use strict";

  function createTransactionViews(context) {
    const {
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    } = context;
    const { buildTransactionList } =
      window.PropertyDeskTransactionListModel.create({
        state,
        dateOnly,
        expenseCategoryLabel,
      });
    const { currentMonthTotals } =
      window.PropertyDeskTransactionSummaryModel.create({
        state,
        postedOnOrAfter,
        monthStart,
        sumIncome,
        sumOperatingExpenses,
      });
    const { transactionRowHTML } = window.PropertyDeskTransactionRowView.create(
      {
        esc,
        money,
        fmtDate,
      },
    );

    function attachEvents() {
      $("payment-search").addEventListener("input", renderPayments);
      $("payment-period").addEventListener("change", renderPayments);
      $("transaction-type").addEventListener("change", renderPayments);
    }

    function renderPayments() {
      const rows = buildTransactionList({
        period: $("payment-period").value,
        query: $("payment-search").value,
        type: $("transaction-type").value,
      });
      const totals = currentMonthTotals();
      $("payments-table").innerHTML = rows.map(transactionRowHTML).join("");
      $("payments-empty").classList.toggle("hidden", rows.length > 0);
      if (!rows.length) {
        $("payments-empty").textContent = "No transactions match this view.";
      }
      $("payments-collected").textContent = money(totals.collected);
      $("expenses-total").textContent = money(totals.expenses);
      $("net-cash-flow").textContent = money(totals.netCashFlow);
    }

    return { renderPayments, attachEvents };
  }

  window.PropertyDeskTransactionViews = Object.freeze({
    create: createTransactionViews,
  });
})();
