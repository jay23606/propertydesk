/* Render a property's recent activity rows and cash-flow totals. */
(() => {
  "use strict";

  function createPropertyActivityView({ money, fmtDate, esc }) {
    function renderRecentActivity(transactions) {
      return `<div class="detail-section">
        <h3>Recent activity</h3>${
          transactions.length
            ? `<div class="table-wrap property-detail-table">
        <table>
        <thead>
        <tr>
        <th>DATE</th>
        <th>TYPE</th>
        <th>ACCOUNT / DETAILS</th>
        <th>AMOUNT</th>
        </tr>
        </thead>
        <tbody>${transactions
          .map(
            (item) => `<tr class="${item.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(item.date)}</td>
        <td>${esc(item.kind)}</td>
        <td>${esc(item.label)}${
              item.memo
                ? `<br><span class="muted">${esc(item.memo)}</span>`
                : ""
            }</td>
        <td class="${item.amount < 0 ? "negative-amount" : ""}">${item.amount < 0 ? "−" : ""}${money(Math.abs(item.amount))}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`
            : '<p class="list-empty">Recorded income and expenses will appear here.</p>'
        }</div>`;
    }

    return { renderRecentActivity };
  }

  window.PropertyDeskPropertyActivityView = Object.freeze({
    create: createPropertyActivityView,
  });
})();
