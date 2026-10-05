/* Render prepared security-deposit data inside account details. */
(() => {
  "use strict";

  function createDepositDetailsView({ money, fmtDate, esc }) {
    function depositSectionHTML(details) {
      if (!details) return "";
      const { rows, totals, accountId, canReverseRetention } = details;
      const rowsHTML = rows
        .map(
          (row) => `<tr class="${row.active ? "" : "transaction-voided"}">
        <td>${fmtDate(row.date)}</td>
        <td>${esc(row.type)}</td>
        <td>${money(row.amount)}</td>
        <td>${esc(row.reason || "—")}${row.active ? "" : '<small class="table-subtext">Source transaction voided · excluded from held balance</small>'}</td>
        </tr>`,
        )
        .join("");

      return `<div class="detail-section">
        <h3>Security deposit ledger</h3>
        <div class="detail-kpis">
        <div class="detail-kpi">
        <small>Held balance</small>
        <strong>${money(totals.held)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Received</small>
        <strong>${money(totals.received)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Refunded</small>
        <strong>${money(totals.refunded)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Retained</small>
        <strong>${money(totals.retained - totals.restored)}</strong>
        </div>
        </div>
        <p class="field-hint">Deposit funds are tracked separately from rent and operating expenses. Retention is a liability adjustment; review its tax treatment separately.</p>
        <div class="portfolio-row-actions">
        <button type="button" class="button secondary compact" data-deposit-adjustment="retained" data-account-id="${esc(accountId)}">Record amount retained</button>${canReverseRetention ? `<button type="button" class="button secondary compact" data-deposit-adjustment="restored" data-account-id="${esc(accountId)}">Reverse retention</button>` : ""}</div>${
          rowsHTML
            ? `<div class="table-wrap property-detail-table">
        <table>
        <thead>
        <tr>
        <th>DATE</th>
        <th>MOVEMENT</th>
        <th>AMOUNT</th>
        <th>REASON / STATUS</th>
        </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
        </table>
        </div>`
            : '<p class="list-empty">Security deposit receipts, refunds, and adjustments will appear here.</p>'
        }</div>`;
    }

    return { depositSectionHTML };
  }

  window.PropertyDeskDepositDetailsView = Object.freeze({
    create: createDepositDetailsView,
  });
})();
