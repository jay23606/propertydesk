/* Render account details from prepared account, ledger, and schedule data. */
(() => {
  "use strict";

  function createAccountDetailsView({
    money, fmtDate, esc, prettyType, paymentFrequencyLabel,
  }) {
    function renderAccountDetails({
      account,
      propertyName,
      propertyAddressText,
      postedPaymentTotal,
      estimatedLoanBalance,
      unpaidDue,
      unpaidSinceLabel,
      depositHTML,
      schedule,
      historyHTML,
      payments,
    }) {
      const scheduleHTML = schedule.length
        ? `<div class="detail-section">
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
        <tbody>${schedule
          .map(
            (row) => `<tr>
        <td>${row.i} · ${fmtDate(row.date, { month: "short", year: "2-digit" })}</td>
        <td>${money(row.payment)}</td>
        <td>${money(row.principal)}</td>
        <td>${money(row.interest)}</td>
        <td>${money(row.balance)}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>
        <p class="field-hint">Estimate uses explicit P&I when set; otherwise it derives P&I from principal, rate and term. Taxes/insurance escrow is excluded. The on-time estimate follows this schedule through the selected date regardless of receipts recorded. The owner adjustment changes the displayed balance without rewriting historical schedule rows.</p>
        </div>`
        : "";
      const isRental = account.account_type === "rental";

      return `<div class="detail-kpis">
        <div class="detail-kpi">
        <small>Property</small>
        <strong>${esc(propertyName)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Regular payment</small>
        <strong>${money(account.payment_amount)}</strong>
        </div>
        <div class="detail-kpi">
        <small>${isRental ? "Collected to date" : "Estimated loan balance · on-time schedule"}</small>
        <strong>${isRental ? money(postedPaymentTotal) : money(estimatedLoanBalance)}</strong>
        </div>
        </div>
        <div class="detail-section">
        <h3>${esc(prettyType(account.account_type))} · ${esc(account.party_name || "No party recorded")}</h3>
        <div class="list-row">
        <div class="row-copy">
        <strong>${esc(propertyAddressText)}</strong>
        <small>Next due ${fmtDate(account.next_due_date)} · ${esc(paymentFrequencyLabel(account.payment_frequency))} · unpaid due tracked since ${unpaidSinceLabel}: ${money(unpaidDue)}</small>
        </div>
        <button type="button" data-account-detail-edit="${esc(account.id)}" class="button secondary compact">Edit</button>
        <button type="button" data-account-detail-payment="${esc(account.id)}" class="button primary compact">Record payment</button>
        </div>
        </div><div id="detail-deposit-section">${depositHTML}</div>${scheduleHTML}${historyHTML}<div class="detail-section">
        <h3>Payment history (${payments.length})</h3>${
          payments.length
            ? `<div class="schedule-table">
        <table>
        <thead>
        <tr>
        <th>Date</th>
        <th>Amount received</th>
        <th>Status</th>
        <th>Memo</th>
        </tr>
        </thead>
        <tbody>${payments
          .map(
            (payment) => `<tr class="${payment.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(payment.received_date)}</td>
        <td>${money(payment.amount)}</td>
        <td>${payment.status === "voided" ? "Voided" : "Posted"}</td>
        <td>${esc(payment.memo || "—")}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`
            : '<div class="list-empty">No payments recorded for this account.</div>'
        }</div><div class="detail-section">
        <button type="button" data-account-detail-close="${esc(account.id)}" class="text-button">Close account and preserve its history</button>
        </div>`;
    }

    return { renderAccountDetails };
  }

  window.PropertyDeskAccountDetailsView = Object.freeze({
    create: createAccountDetailsView,
  });
})();
