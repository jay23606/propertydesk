/* Render dashboard summaries and property cards. */
(() => {
  "use strict";

  function createOverview({
    $,
    esc,
    prettyKind,
    money,
    propertyAddress,
    prettyType,
    fmtDate,
    overviewModel,
  }) {
    function upcomingPaymentRow({ account, property }) {
      const icon = account.account_type === "rental" ? "⌂" : "▤";
      const party = account.party_name || account.name;
      const propertyName = property?.name || "Property";
      const dueDate = fmtDate(account.next_due_date, {
        month: "short",
        day: "numeric",
      });
      return `<div class="list-row">
        <span class="round-icon">${icon}</span>
        <div class="row-copy">
        <strong>${esc(party)}</strong>
        <small>${esc(propertyName)} · ${esc(prettyType(account.account_type))}</small>
        </div>
        <div class="row-right">
        <strong>${money(account.payment_amount)}</strong>
        <small>Due ${dueDate}</small>
        </div>
        </div>`;
    }

    function recentPaymentRow({ payment, account, property }) {
      const party = account?.party_name || account?.name || "Payment";
      const propertyName = property?.name || "Property";
      const receivedDate = fmtDate(payment.received_date, {
        month: "short",
        day: "numeric",
      });
      return `<div class="list-row">
        <span class="round-icon">↙</span>
        <div class="row-copy">
        <strong>${esc(party)}</strong>
        <small>${esc(propertyName)} · ${receivedDate}</small>
        </div>
        <div class="row-right">
        <strong>${money(payment.amount)}</strong>
        <small>${esc(payment.payment_method.replace("_", " "))}</small>
        </div>
        </div>`;
    }

    function propertyCard(summary) {
      const { property, parties } = summary;
      return `<article class="property-card" data-property-card="${esc(property.id)}">
        <div class="property-art">
        <span class="property-type">${esc(prettyKind(property.property_kind))}</span>
        <span class="property-building">
        </span>
        </div>
        <div class="property-info">
        <h3>${esc(property.name)}</h3>
        <div class="property-address">${esc(propertyAddress(property))}</div>${parties ? `<div class="property-party">${esc(parties)}</div>` : ""}<div class="property-summary-grid">
        <div>
        <small>Monthly payment</small>
        <strong>${summary.hasNonMonthly ? "≈ " : ""}${money(summary.scheduledMonthly)}</strong>
        </div>
        <div>
        <small>Loan balance</small>
        <strong>${summary.loanBalance ? money(summary.loanBalance) : summary.hasLoanAccount ? "$0.00" : "—"}</strong>
        </div>
        <div>
        <small>Balance due · carries forward</small>
        <strong>${money(summary.amountDue)}</strong>
        </div>
        <button class="button primary compact property-quick-payment" type="button" data-property-payment="${esc(property.id)}">＋ Record payment</button>
        </div>
        </div>
        </article>`;
    }

    function renderOverview() {
      const summary = overviewModel.buildOverview();
      $("stat-properties").textContent = summary.propertyCount;
      $("stat-accounts").textContent = summary.accountCount;
      $("stat-collected").textContent = money(summary.collected);
      $("stat-expected").textContent = money(summary.expected);
      $("stat-collected-foot").textContent =
        `${summary.recordedPaymentCount} payment${summary.recordedPaymentCount === 1 ? "" : "s"} recorded`;
      $("upcoming-list").innerHTML = summary.upcoming.length
        ? summary.upcoming.map(upcomingPaymentRow).join("")
        : '<div class="list-empty">No upcoming payments yet. Add an account to get started.</div>';
      $("activity-list").innerHTML = summary.recent.length
        ? summary.recent.map(recentPaymentRow).join("")
        : '<div class="list-empty">Recorded payments will appear here.</div>';
      $("overview-properties").innerHTML =
        summary.propertyCards.map(propertyCard).join("") ||
        '<div class="list-empty">Add your first property to build your portfolio.</div>';
    }

    return { renderOverview };
  }

  window.PropertyDeskOverview = Object.freeze({ create: createOverview });
})();
