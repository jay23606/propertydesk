/* PropertyDesk property and account detail views. */
(() => {
  "use strict";

  function createDetailViews(context) {
    const {
      $,
      state,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      depositLedger,
      openModal,
      closeModal,
      editAccount,
      openPayment,
      deleteAccount,
      propertyAddress,
    } = context;

    function openPropertyDetails(id) {
      state.auditRequestId++;
      const property = state.properties.find((x) => x.id === id);
      if (!property) return;
      state.selectedPropertyId = id;
      const accounts = state.accounts.filter((a) => a.property_id === id),
        accountIds = new Set(accounts.map((a) => a.id));
      const income = state.payments.filter(
          (p) => accountIds.has(p.account_id) && isPosted(p),
        ),
        accountPayments = state.payments.filter((p) =>
          accountIds.has(p.account_id),
        ),
        allExpenses = state.expenses.filter((e) => e.property_id === id),
        expenses = allExpenses.filter(isPosted);
      const incomeTotal = sumIncome(income),
        expenseTotal = sumOperatingExpenses(expenses);
      const transactions = [
        ...income.map((item) => ({
          date: item.received_date,
          kind:
            item.income_category === "deposit" ? "Security deposit" : "Income",
          label:
            accounts.find((a) => a.id === item.account_id)?.name || "Payment",
          amount: Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...accountPayments
          .filter((p) => !isPosted(p))
          .map((item) => ({
            date: item.received_date,
            kind: "Income · voided",
            label:
              accounts.find((a) => a.id === item.account_id)?.name || "Payment",
            amount: Number(item.amount || 0),
            memo: item.memo,
            status: item.status,
          })),
        ...expenses.map((item) => ({
          date: item.expense_date,
          kind: "Expense",
          label: item.payee || item.category || "Expense",
          amount: -Number(item.amount || 0),
          memo: item.memo,
          status: item.status,
        })),
        ...allExpenses
          .filter((e) => !isPosted(e))
          .map((item) => ({
            date: item.expense_date,
            kind: "Expense · voided",
            label: item.payee || item.category || "Expense",
            amount: -Number(item.amount || 0),
            memo: item.memo,
            status: item.status,
          })),
      ]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 8);
      $("property-detail-title").textContent = property.name;
      $("property-detail-address").textContent = propertyAddress(property);
      $("property-detail-add-income").disabled = !accounts.some(
        (a) => a.status === "active",
      );
      const propertyDocs = state.documents.filter((d) => d.property_id === id);
      $("property-detail-content").innerHTML =
        `<div class="detail-kpis property-detail-kpis">
        <div class="detail-kpi">
        <small>Accounts</small>
        <strong>${accounts.filter((a) => a.status === "active").length} active</strong>
        </div>
        <div class="detail-kpi">
        <small>Posted income</small>
        <strong>${money(incomeTotal)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Posted expenses</small>
        <strong>${money(expenseTotal)}</strong>
        </div>
        <div class="detail-kpi">
        <small>Net cash flow</small>
        <strong>${money(incomeTotal - expenseTotal)}</strong>
        </div>
        </div>
        <div class="detail-section">
        <h3>Account holders</h3>
        <p class="field-hint">Labels for sorting only. Workspace members can access every property.</p>
        <div class="holder-choices">${state.workspaceMembers.map((m) => `<label>
        <input type="checkbox" data-holder-choice value="${esc(m.member_user_id)}" ${state.propertyHolders.some((h) => h.property_id === id && h.member_user_id === m.member_user_id) ? "checked" : ""}> ${esc(m.display_name || m.email)}</label>`).join("")}</div>
        <button class="button secondary compact" type="button" data-save-holders>Save labels</button>
        </div>
        <div class="detail-section">
        <h3>Accounts at this property</h3>${accounts.length ? `<div class="table-wrap property-detail-table property-account-table">
        <table>
        <thead>
        <tr>
        <th>ACCOUNT</th>
        <th>PARTY</th>
        <th>SCHEDULED PAYMENT</th>
        <th>ESTIMATED LOAN BALANCE</th>
        <th>
        </th>
        </tr>
        </thead>
        <tbody>${accounts.map((a) => `<tr>
        <td>
        <button type="button" class="table-action account-edit-link" data-edit-account="${esc(a.id)}" aria-label="Edit ${esc(a.name)}">${esc(a.name)}</button>
        <br>
        <span class="kind-pill">${esc(prettyType(a.account_type))}</span>
        </td>
        <td>
        <button type="button" class="table-action account-edit-link" data-edit-account="${esc(a.id)}" aria-label="Edit account for ${esc(a.party_name || a.name)}">${esc(a.party_name || "—")}</button>
        </td>
        <td>${money(a.payment_amount)} / ${esc(paymentFrequencyLabel(a.payment_frequency).toLowerCase())}</td>
        <td>${a.account_type === "rental" ? "—" : money(accountBalance(a))}</td>
        <td>
        <button class="table-action" data-detail="${esc(a.id)}">Open</button>
        </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>` : '<p class="list-empty">No accounts yet. Add a rental, land contract, or private note.</p>'}</div>
        <div class="detail-section">
        <h3>Agreements and documents</h3>
        <p class="field-hint">Files are private to your workspace. Select an agreement name to open or download it in your browser. PDFs, DOCX, and JPEG agreements up to 15 MB are supported.</p>
        <label class="button secondary file-button">↑ Upload agreement<input type="file" data-property-document accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg">
        </label>
        <div class="document-list">${propertyDocs.length ? propertyDocs.map((doc) => `<div class="document-row">
        <span>▤</span>
        <div>
        <a class="document-name-link" href="#" data-open-document="${esc(doc.id)}">${esc(doc.file_name)}</a>
        <small>${esc(doc.content_type || "Document")} · ${fmtDate(String(doc.created_at || "").slice(0, 10))}</small>
        </div>
        <button type="button" class="button secondary compact document-delete" data-delete-document="${esc(doc.id)}" aria-label="Delete ${esc(doc.file_name)}">Delete</button>
        </div>`).join("") : '<p class="list-empty">No agreement files attached yet.</p>'}</div>
        </div>
        <div class="detail-section">
        <h3>Recent activity</h3>${transactions.length ? `<div class="table-wrap property-detail-table">
        <table>
        <thead>
        <tr>
        <th>DATE</th>
        <th>TYPE</th>
        <th>ACCOUNT / DETAILS</th>
        <th>AMOUNT</th>
        </tr>
        </thead>
        <tbody>${transactions.map((x) => `<tr class="${x.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(x.date)}</td>
        <td>${esc(x.kind)}</td>
        <td>${esc(x.label)}${x.memo ? `<br>
        <span class="muted">${esc(x.memo)}</span>` : ""}</td>
        <td class="${x.amount < 0 ? "negative-amount" : ""}">${x.amount < 0 ? "−" : ""}${money(Math.abs(x.amount))}</td>
        </tr>`).join("")}</tbody>
        </table>
        </div>` : '<p class="list-empty">Recorded income and expenses will appear here.</p>'}</div>`;
      $("property-archive-toggle").textContent = property.archived_at
        ? "Restore property"
        : "Archive property";
      openModal("property-detail-modal");
    }
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
        <button type="button" class="button secondary compact" data-deposit-adjustment="retained" data-account-id="${esc(account.id)}">Record amount retained</button>${totals.retained > totals.restored ? `<button type="button" class="button secondary compact" data-deposit-adjustment="restored" data-account-id="${esc(account.id)}">Reverse retention</button>` : ""}</div>${rows ? `<div class="table-wrap property-detail-table">
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
        </div>` : '<p class="list-empty">Security deposit receipts, refunds, and adjustments will appear here.</p>'}</div>`;
    }
    async function openAccountDetails(id) {
      const auditRequestId = ++state.auditRequestId;
      const a = state.accounts.find((x) => x.id === id);
      if (!a) return;
      const p = state.properties.find((x) => x.id === a.property_id);
      const payments = state.payments.filter((x) => x.account_id === id);
      const schedule = a.account_type === "rental" ? [] : amortizationSchedule(
        a.original_principal,
        a.interest_rate,
        a.term_months,
        a.start_date,
        a.principal_interest_amount,
      );
      const auditIds = [
        a.id,
        ...payments.slice(0, 50).map((payment) => payment.id),
      ];
      let history = [],
        auditError = false;
      try {
        const result = await state.client
          .from("pd_audit_events")
          .select("id,entity_type,entity_id,action,created_at")
          .in("entity_id", auditIds)
          .order("created_at", { ascending: false })
          .limit(100);
        history = result.data || [];
        auditError = Boolean(result.error);
      } catch {
        auditError = true;
      }
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
        <tbody>${schedule.map((s) => `<tr>
        <td>${s.i} · ${fmtDate(s.date, { month: "short", year: "2-digit" })}</td>
        <td>${money(s.payment)}</td>
        <td>${money(s.principal)}</td>
        <td>${money(s.interest)}</td>
        <td>${money(s.balance)}</td>
        </tr>`).join("")}</tbody>
        </table>
        </div>
        <p class="field-hint">Estimate uses explicit P&I when set; otherwise it derives P&I from principal, rate and term. Taxes/insurance escrow is excluded. The on-time estimate follows this schedule through the selected date regardless of receipts recorded. The owner adjustment changes the displayed balance without rewriting historical schedule rows.</p>
        </div>`
        : "";
      const accountVersions = state.agreementVersions.filter(
        (v) => v.account_id === a.id,
      );
      const versionsHTML = `<div class="detail-section">
        <h3>Prior agreement terms</h3>${
        accountVersions.length
          ? `<div class="audit-list">${accountVersions
              .map((v) => {
                const t = v.terms || {};
                return `<div class="audit-row">
        <div>
        <strong>${esc(v.reason || "Terms updated")}</strong>
        <small>${fmtDate(v.effective_from)} – ${fmtDate(v.replaced_on)} · ${money(t.payment_amount)} scheduled · ${money(t.original_principal)} principal · ${Number(t.interest_rate || 0)}% · ${Number(t.term_months || 0)} months</small>${t.party_name ? `<small>${esc(t.party_name)}</small>` : ""}</div>
        <time datetime="${esc(v.created_at)}">${fmtDate(String(v.created_at || "").slice(0, 10))}</time>
        </div>`;
              })
              .join("")}</div>`
          : '<p class="list-empty">Amendments and prior terms will appear here when recorded.</p>'
      }</div>`;
      const auditHTML = `<div class="detail-section">
        <h3>Change history</h3>
        <p class="field-hint">Latest account and payment events. Original entries remain available after a void.</p>${
        history.length
          ? `<div class="audit-list">${history
              .map((event) => {
                const target =
                    event.entity_type === "pd_accounts" ? "Account" : "Payment",
                  action =
                    event.action === "created"
                      ? "Created"
                      : event.action === "updated"
                        ? "Updated"
                        : event.action === "voided"
                          ? "Voided"
                          : event.action === "deleted"
                            ? "Deleted"
                            : "Recorded",
                  reason =
                    event.action === "voided"
                      ? state.payments.find(
                          (payment) => payment.id === event.entity_id,
                        )?.void_reason
                      : "";
                return `<div class="audit-row">
        <div>
        <strong>${action} ${target.toLowerCase()}</strong>${reason ? `<small>Reason: ${esc(reason)}</small>` : ""}</div>
        <time datetime="${esc(event.created_at)}">${esc(new Date(event.created_at).toLocaleString())}</time>
        </div>`;
              })
              .join("")}</div>`
          : auditError
            ? '<p class="list-empty">Change history is temporarily unavailable.</p>'
            : '<p class="list-empty">No changes recorded yet.</p>'
      }</div>`;
      const postedPayments = payments.filter(isPosted);
      $("detail-content").innerHTML =
        `<div class="detail-kpis">
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
        <small>Next due ${fmtDate(a.next_due_date)} · ${esc(paymentFrequencyLabel(a.payment_frequency))} · unpaid due tracked since ${fmtDate(unpaidDueAccrualStart(a), { month: "short", day: "numeric", year: "numeric" })}: ${money(amountDueSince([a], state.payments, unpaidDueAccrualStart(a), todayIso()))}</small>
        </div>
        <button id="detail-edit" class="button secondary compact">Edit</button>
        <button id="detail-record" class="button primary compact">Record payment</button>
        </div>
        </div>${depositSectionHTML(a)}${scheduleHTML}${versionsHTML}<div class="detail-section">
        <h3>Payment history (${payments.length})</h3>${payments.length ? `<div class="schedule-table">
        <table>
        <thead>
        <tr>
        <th>Date</th>
        <th>Amount received</th>
        <th>Status</th>
        <th>Memo</th>
        </tr>
        </thead>
        <tbody>${payments.map((x) => `<tr class="${x.status === "voided" ? "transaction-voided" : ""}">
        <td>${fmtDate(x.received_date)}</td>
        <td>${money(x.amount)}</td>
        <td>${x.status === "voided" ? "Voided" : "Posted"}</td>
        <td>${esc(x.memo || "—")}</td>
        </tr>`).join("")}</tbody>
        </table>
        </div>` : '<div class="list-empty">No payments recorded for this account.</div>'}</div>${auditHTML}<div class="detail-section">
        <button id="detail-delete" class="text-button">Close account and preserve its history</button>
        </div>`;
      $("detail-edit").addEventListener("click", () => {
        closeModal($("detail-modal"));
        editAccount(a);
      });
      $("detail-record").addEventListener("click", () => {
        closeModal($("detail-modal"));
        openPayment(a.id);
      });
      $("detail-delete").addEventListener("click", () => deleteAccount(a));
      openModal("detail-modal");
    }

    return { openPropertyDetails, openAccountDetails };
  }

  window.PropertyDeskDetailViews = Object.freeze({ create: createDetailViews });
})();
