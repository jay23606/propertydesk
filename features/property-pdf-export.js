/* Build a private, one-page printable snapshot of the visible Properties list. */
(() => {
  "use strict";

  const PAYMENT_STATUS = Object.freeze({
    none: "No payment this month",
    partial: "Partial payment this month",
    full: "Paid in full this month",
  });

  function createPropertyPdfExport({
    $,
    getRows,
    propertyAddress,
    esc,
    money,
    toast,
    openWindow = () => window.open("", "_blank"),
    now = () => new Date(),
  }) {
    function reportHTML(rows) {
      const rowCount = Math.max(1, rows.length);
      const fontSize = Math.max(
        6,
        Math.min(9, 9 - Math.max(0, rowCount - 18) * 0.12),
      );
      const generated = now().toLocaleDateString();
      const body = rows
        .map((row) => {
          const account = row.accountRecord || {};
          const cells = [
            propertyAddress(row.property),
            row.partyName,
            account.party_email,
            account.party_phone,
            account.name || (row.hasAccount ? "" : "No account"),
            row.hasAccount ? money(row.scheduledPayment) : "",
            row.hasAccount ? money(row.unpaidDue) : "",
            row.loanBalance == null ? "—" : money(row.loanBalance),
            row.hasAccount
              ? PAYMENT_STATUS[row.paymentStatus] || ""
              : "No account",
            row.property.notes,
          ];
          return `<tr>${cells.map((value) => `<td title="${esc(value || "")}">${esc(value || "—")}</td>`).join("")}</tr>`;
        })
        .join("");

      return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PropertyDesk property report</title>
<style>
  @page { size: letter landscape; margin: .28in; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #17231f; font: ${fontSize}px/1.2 Arial, sans-serif; }
  header { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 8px; }
  h1 { margin: 0; font-size: 16px; }
  .meta { color: #58665f; font-size: 8px; }
  table { border-collapse: collapse; width: 98%; max-width: 100%; table-layout: fixed; }
  th { background: #e8efeb; color: #25372f; font-size: 7px; text-align: left; text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere; }
  th, td { min-width: 0; border: 1px solid #cbd5cf; padding: 3px 4px; vertical-align: top; }
  td { overflow: hidden; overflow-wrap: anywhere; max-height: 2.6em; }
  tr { height: ${Math.max(11, Math.min(20, 540 / rowCount))}px; break-inside: avoid; }
  th:nth-child(1) { width: 15%; } th:nth-child(2) { width: 10%; }
  th:nth-child(3) { width: 13%; } th:nth-child(4) { width: 9%; }
  th:nth-child(5) { width: 9%; } th:nth-child(6), th:nth-child(7), th:nth-child(8) { width: 8%; }
  th:nth-child(9) { width: 10%; } th:nth-child(10) { width: 10%; }
  .empty { padding: 12px; color: #58665f; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<header><h1>PropertyDesk · Properties</h1><div class="meta">${rows.length} visible property/account row(s) · ${esc(generated)}</div></header>
<table><thead><tr><th>Property address</th><th>Buyer / tenant</th><th>Email</th><th>Phone</th><th>Account</th><th>Monthly payment</th><th>Unpaid due</th><th>Estimated loan balance</th><th>Payment this month</th><th>Property note</th></tr></thead>
<tbody>${body || '<tr><td class="empty" colspan="10">No properties in this view.</td></tr>'}</tbody></table>
</body></html>`;
    }

    function exportPDF() {
      const rows = getRows();
      const reportWindow = openWindow();
      if (!reportWindow) {
        toast("Allow pop-ups to print or save the Properties PDF.", "error");
        return;
      }
      reportWindow.document.open();
      reportWindow.document.write(reportHTML(rows));
      reportWindow.document.close();
      window.setTimeout(() => reportWindow.print(), 250);
    }

    function attachEvents() {
      $("properties-export-pdf").addEventListener("click", exportPDF);
    }

    return Object.freeze({ attachEvents, exportPDF, reportHTML });
  }

  window.PropertyDeskPropertyPdfExport = Object.freeze({
    create: createPropertyPdfExport,
  });
})();
