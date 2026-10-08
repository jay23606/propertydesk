/* Render report summaries and import history from prepared report data. */
(() => {
  "use strict";

  function createReportViews({ $, esc, money, buildReportModel }) {
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
      const report = buildReportModel();
      $("report-ytd").textContent = money(report.income);
      $("report-expenses-ytd").textContent = money(report.costs);
      $("report-net-ytd").textContent = money(report.netCashFlow);
      $("report-principal").textContent = money(report.principal);

      const labels = [
        ["rental", "Rentals"],
        ["land_contract", "Land contracts"],
        ["note", "Private notes"],
      ];
      const counts = labels.map(([type]) => report.accountCounts[type]);
      const max = Math.max(1, ...counts);
      $("account-breakdown").innerHTML = labels
        .map(
          ([, label], index) =>
            `<div class="breakdown-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(counts[index] / max) * 100}%"></div></div><strong>${counts[index]}</strong></div>`,
        )
        .join("");
      $("import-history").innerHTML = report.importBatches.length
        ? report.importBatches.map(renderImportBatchRow).join("")
        : '<tr><td colspan="5" class="muted">Completed imports will appear here.</td></tr>';
    }

    return Object.freeze({ renderReports });
  }

  window.PropertyDeskReportViews = Object.freeze({ create: createReportViews });
})();
