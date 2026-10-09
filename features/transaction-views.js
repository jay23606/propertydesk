/* Coordinate transaction filters, summary totals, and view rendering. */
(() => {
  "use strict";

  function createTransactionViews({
    $,
    getProperties,
    getAccounts,
    getPayments,
    getExpenses,
    dateOnly,
    now,
    fmtDate,
    esc,
    expenseCategoryLabel,
    money,
    postedOnOrAfter,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
    modules,
  }) {
    const filterModel = modules.filterModel.create({ dateOnly });
    const associationModel = modules.associationModel.create({
      getProperties,
      getAccounts,
    });
    const displayRowModel = modules.displayRowModel.create({
      expenseCategoryLabel,
    });
    const { buildTransactionList } = modules.listModel.create({
      getPayments,
      getExpenses,
      associationModel,
      displayRowModel,
      filterModel,
    });
    const { currentMonthTotals } = modules.summaryModel.create({
      getPayments,
      getExpenses,
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });
    const { transactionRowHTML } = modules.rowView.create({
      esc,
      money,
      fmtDate,
    });

    function attachTransactionFilterEvents() {
      $("payment-search").addEventListener("input", renderPayments);
      $("payment-period").addEventListener("change", renderPayments);
      $("transaction-type").addEventListener("change", renderPayments);
    }

    function renderPayments() {
      const rows = buildTransactionList({
        period: $("payment-period").value,
        query: $("payment-search").value,
        type: $("transaction-type").value,
        now: now(),
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

    return Object.freeze({ renderPayments, attachTransactionFilterEvents });
  }

  window.PropertyDeskTransactionViews = Object.freeze({
    create: createTransactionViews,
  });
})();
