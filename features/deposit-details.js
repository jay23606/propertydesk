/* Render the rental security-deposit ledger within account details. */
(() => {
  "use strict";

  function createDepositDetails({
    $, state, depositLedger, money, fmtDate, esc, recordDepositAdjustment,
  }) {
    function depositSectionHTML(account) {
      if (account.account_type !== "rental") return "";
      const { entries, active, totals } = depositLedger(account.id),
        activeIds = new Set(active.map((row) => row.id));
      const label = {
        received: "Received",
        refunded: "Refunded",
        retained: "Retained",
        restored: "Retention reversed",
      };
      const rows = entries
        .map((entry) => {
          const payment =
              entry.source_payment_id &&
              state.payments.find((row) => row.id === entry.source_payment_id),
            expense =
              entry.source_expense_id &&
              state.expenses.find((row) => row.id === entry.source_expense_id),
            reason = entry.reason || payment?.memo || expense?.memo || "";
          return `<tr class="${activeIds.has(entry.id) ? "" : "transaction-voided"}">
        <td>${fmtDate(entry.movement_date)}</td>
        <td>${esc(label[entry.entry_type] || entry.entry_type)}</td>
        <td>${money(entry.amount)}</td>
        <td>${esc(reason || "—")}${activeIds.has(entry.id) ? "" : '<small class="table-subtext">Source transaction voided · excluded from held balance</small>'}</td>
        </tr>`;
        })
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
        <button type="button" class="button secondary compact" data-deposit-adjustment="retained" data-account-id="${esc(account.id)}">Record amount retained</button>${totals.retained > totals.restored ? `<button type="button" class="button secondary compact" data-deposit-adjustment="restored" data-account-id="${esc(account.id)}">Reverse retention</button>` : ""}</div>${
          rows
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
        <tbody>${rows}</tbody>
        </table>
        </div>`
            : '<p class="list-empty">Security deposit receipts, refunds, and adjustments will appear here.</p>'
        }</div>`;
    }

    function attachEvents() {
      $("detail-content").addEventListener("click", async (event) => {
        const adjustment = event.target.closest("[data-deposit-adjustment]");
        if (adjustment) {
          const { accountId, depositAdjustment } = adjustment.dataset;
          const saved = await recordDepositAdjustment(
            accountId,
            depositAdjustment,
          );
          if (!saved) return;
          const account = state.accounts.find((row) => row.id === accountId);
          const section = $("detail-deposit-section");
          if (account && section) {
            section.innerHTML = depositSectionHTML(account);
          }
        }
      });
    }

    return { depositSectionHTML, attachEvents };
  }

  window.PropertyDeskDepositDetails = Object.freeze({ create: createDepositDetails });
})();
