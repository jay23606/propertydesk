/* Account detail rendering, loan schedules, and payment history. */
(() => {
  "use strict";

  function createAccountDetails(context) {
    const {
      $, state, isPosted, money, fmtDate, esc, prettyType, paymentFrequencyLabel,
      accountBalance, amortizationSchedule, amountDueSince, unpaidDueAccrualStart,
      todayIso, openModal, closeModal, editAccount, openPayment,
      closeAccount, propertyAddress, depositSectionHTML, renderAccountHistory,
    } = context;
    async function openAccountDetails(id) {
      const auditRequestId = ++state.auditRequestId;
      const a = state.accounts.find((x) => x.id === id);
      if (!a) return;
      const p = state.properties.find((x) => x.id === a.property_id);
      const payments = state.payments.filter((x) => x.account_id === id);
      const schedule =
        a.account_type === "rental"
          ? []
          : amortizationSchedule(
              a.original_principal,
              a.interest_rate,
              a.term_months,
              a.start_date,
              a.principal_interest_amount,
            );
      const historyHTML = await renderAccountHistory(a, payments);
      if (auditRequestId !== state.auditRequestId) return;
      $("detail-title").textContent = a.name;
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
            (s) => `<tr>
        <td>${s.i} · ${fmtDate(s.date, { month: "short", year: "2-digit" })}</td>
        <td>${money(s.payment)}</td>
        <td>${money(s.principal)}</td>
        <td>${money(s.interest)}</td>
        <td>${money(s.balance)}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>
        <p class="field-hint">Estimate uses explicit P&I when set; otherwise it derives P&I from principal, rate and term. Taxes/insurance escrow is excluded. The on-time estimate follows this schedule through the selected date regardless of receipts recorded. The owner adjustment changes the displayed balance without rewriting historical schedule rows.</p>
        </div>`
        : "";
      const postedPayments = payments.filter(isPosted);
      $("detail-content").innerHTML = `<div class="detail-kpis">
        <div class="detail-kpi">
        <small>Property</small>
        <strong>${esc(p?.name || "—")}</strong>
        </div>
        <div class="detail-kpi">
        <small>Regular payment</small>
        <strong>${money(a.payment_amount)}</strong>
        </div>
        <div class="detail-kpi">
        <small>${a.account_type === "rental" ? "Collected to date" : "Estimated loan balance · on-time schedule"}</small>
        <strong>${a.account_type === "rental" ? money(postedPayments.reduce((s, x) => s + Number(x.amount), 0)) : money(accountBalance(a))}</strong>
        </div>
        </div>
        <div class="detail-section">
        <h3>${esc(prettyType(a.account_type))} · ${esc(a.party_name || "No party recorded")}</h3>
        <div class="list-row">
        <div class="row-copy">
        <strong>${esc(propertyAddress(p || {}))}</strong>
        <small>Next due ${fmtDate(a.next_due_date)} · ${esc(paymentFrequencyLabel(a.payment_frequency))} · unpaid due tracked since ${fmtDate(unpaidDueAccrualStart(), { month: "short", day: "numeric", year: "numeric" })}: ${money(amountDueSince([a], state.payments, unpaidDueAccrualStart(), todayIso()))}</small>
        </div>
        <button id="detail-edit" class="button secondary compact">Edit</button>
        <button id="detail-record" class="button primary compact">Record payment</button>
        </div>
        </div><div id="detail-deposit-section">${depositSectionHTML(a)}</div>${scheduleHTML}${historyHTML}<div class="detail-section">
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
              x,
            ) => `<tr class="${x.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(x.received_date)}</td>
        <td>${money(x.amount)}</td>
        <td>${x.status === "voided" ? "Voided" : "Posted"}</td>
        <td>${esc(x.memo || "—")}</td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`
            : '<div class="list-empty">No payments recorded for this account.</div>'
        }</div><div class="detail-section">
        <button id="detail-close-account" class="text-button">Close account and preserve its history</button>
        </div>`;
      $("detail-edit").addEventListener("click", () => {
        closeModal($("detail-modal"));
        editAccount(a);
      });
      $("detail-record").addEventListener("click", () => {
        closeModal($("detail-modal"));
        openPayment(a.id);
      });
      $("detail-close-account").addEventListener("click", () => closeAccount(a));
      openModal("detail-modal");
    }

    return { openAccountDetails };
  }

  window.PropertyDeskAccountDetails = Object.freeze({ create: createAccountDetails });
})();
