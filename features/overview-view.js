/* Render dashboard payment rows and property cards. */
(() => {
  "use strict";

  function createOverviewView({
    esc,
    prettyKind,
    money,
    propertyAddress,
    prettyType,
    fmtDate,
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

    return Object.freeze({
      upcomingPaymentRow,
      recentPaymentRow,
      propertyCard,
    });
  }

  window.PropertyDeskOverviewView = Object.freeze({
    create: createOverviewView,
  });
})();
