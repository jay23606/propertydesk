/* Portfolio-level financial and import-history reports. */
(() => {
  "use strict";

  function createReportViews({
    $,
    state,
    dateOnly,
    esc,
    money,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  }) {
    function renderImportBatchRow(batch) {
      return `<tr>
        <td><strong>${esc(batch.source_name || "CSV import")}</strong></td>
        <td>${esc(batch.source_type)}</td>
        <td>${esc(new Date(batch.created_at).toLocaleString())}</td>
        <td>${Number(batch.rows_accepted)} of ${Number(batch.rows_total)}</td>
        <td><span class="status-pill">${esc(batch.status)}</span></td>
      </tr>`;
    }

    function renderReports() {
      const year = new Date().getFullYear();
      const income = sumIncome(
        state.payments.filter(
          (payment) => dateOnly(payment.received_date)?.getFullYear() === year,
        ),
      );
      const costs = sumOperatingExpenses(
        state.expenses.filter(
          (expense) => dateOnly(expense.expense_date)?.getFullYear() === year,
        ),
      );

      $("report-ytd").textContent = money(income);
      $("report-expenses-ytd").textContent = money(costs);
      $("report-net-ytd").textContent = money(income - costs);
      $("report-principal").textContent = money(
        state.accounts
          .filter((account) => account.account_type !== "rental")
          .reduce((sum, account) => sum + accountBalance(account), 0),
      );

      const labels = [
        ["rental", "Rentals"],
        ["land_contract", "Land contracts"],
        ["note", "Private notes"],
      ];
      const counts = labels.map(
        ([type]) =>
          state.accounts.filter((account) => account.account_type === type).length,
      );
      const max = Math.max(1, ...counts);
      $("account-breakdown").innerHTML = labels
        .map(
          ([type, label], index) =>
            `<div class="breakdown-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(counts[index] / max) * 100}%"></div></div><strong>${counts[index]}</strong></div>`,
        )
        .join("");
      $("import-history").innerHTML = state.importBatches.length
        ? state.importBatches.map(renderImportBatchRow).join("")
        : '<tr><td colspan="5" class="muted">Completed imports will appear here.</td></tr>';
    }

    return { renderReports };
  }

  window.PropertyDeskReportViews = Object.freeze({ create: createReportViews });
})();
