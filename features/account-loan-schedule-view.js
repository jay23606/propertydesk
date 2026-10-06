/* Render the hypothetical on-time amortization schedule for an account. */
(() => {
  "use strict";

  function create({ money, fmtDate }) {
    function accountLoanScheduleHTML(schedule) {
      if (!schedule.length) return "";
      const rows = schedule
        .map(
          (row) => `<tr>
        <td>${row.i} · ${fmtDate(row.date, { month: "short", year: "2-digit" })}</td>
        <td>${money(row.payment)}</td>
        <td>${money(row.principal)}</td>
        <td>${money(row.interest)}</td>
        <td>${money(row.balance)}</td>
        </tr>`,
        )
        .join("");

      return `<div class="detail-section">
        <h3>Estimated amortization schedule</h3>
        <div class="schedule-table">
        <table>
        <thead>
        <tr>
        <th># / Due</th>
        <th>Payment</th>
        <th>Principal</th>
        <th>Interest</th>
        <th>Balance</th>
        </tr>
        </thead>
        <tbody>${rows}</tbody>
        </table>
        </div>
        <p class="field-hint">Estimate uses explicit P&I when set; otherwise it derives P&I from principal, rate and term. Taxes/insurance escrow is excluded. The on-time estimate follows this schedule through the selected date regardless of receipts recorded. The owner adjustment changes the displayed balance without rewriting historical schedule rows.</p>
        </div>`;
    }

    return { accountLoanScheduleHTML };
  }

  window.PropertyDeskAccountLoanScheduleView = Object.freeze({ create });
})();
