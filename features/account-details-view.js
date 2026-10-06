/* Render account details from prepared account, ledger, and schedule data. */
(() => {
  "use strict";

  function createAccountDetailsView({
    money,
    fmtDate,
    esc,
    prettyType,
    paymentFrequencyLabel,
    accountLoanScheduleHTML,
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
      const scheduleHTML = accountLoanScheduleHTML(schedule);
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
            (
              payment,
            ) => `<tr class="${payment.status === "voided" ? "transaction-voided" : ""}">
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
