/* HTML presentation for the Properties portfolio table. */
(() => {
  "use strict";

  const { isActiveAccount } = window.PropertyDeskAccountStatusUtils;
  const PAYMENT_STATUS_CLASS = Object.freeze({
    none: "payment-not-received-this-month",
    partial: "payment-received-this-month",
    full: "payment-paid-in-full-this-month",
  });
  const PAYMENT_STATUS_TITLE = Object.freeze({
    none: "No payment received this month",
    partial: "Partial payment received this month",
    full: "Full scheduled amount received this month",
  });

  function create({ esc, money, paymentFrequencyLabel }) {
    function propertyAddressCell(property, street) {
      const note = String(property.notes || "").trim();
      return `<td>
        <button class="table-action property-row-name" data-property-open="${esc(property.id)}">${esc(street)}${property.archived_at ? " · Archived" : ""}</button>
        <button type="button" class="property-row-note${note ? " has-note" : ""}" data-property-note="${esc(property.id)}" aria-label="${esc(note ? "Edit" : "Add")} quick note for ${esc(street)}" title="${esc(note || "Add a quick note")}">${note ? `<em>${esc(note)}</em>` : "<em>＋ Add note</em>"}</button>
        </td>`;
    }

    function accountRowHTML({
      property,
      account,
      street,
      due,
      monthly,
      loanBalance,
      partyName,
      paymentStatus,
      reminderHref,
      recipientHint,
    }) {
      const paymentAmount =
        account.payment_frequency === "monthly"
          ? money(account.payment_amount)
          : `≈ ${money(monthly)}`;
      const frequencyHint =
        account.payment_frequency === "monthly"
          ? "Monthly"
          : `${money(account.payment_amount)} / ${paymentFrequencyLabel(account.payment_frequency).toLowerCase()}`;
      const inactiveHint = isActiveAccount(account) ? "" : " · Inactive";

      return `<tr>
        <td class="${PAYMENT_STATUS_CLASS[paymentStatus]}" title="${PAYMENT_STATUS_TITLE[paymentStatus]}">
        <button type="button" class="button primary compact" data-account-payment="${esc(account.id)}">＋ Payment</button>
        </td>
        <td class="portfolio-due">${money(due)}</td>
        ${propertyAddressCell(property, street)}
        <td>
        <a class="table-action" href="${esc(reminderHref)}" title="${esc(recipientHint)}" aria-label="${esc(`Draft late reminder email for ${partyName}`)}">${esc(partyName)}</a>
        <small class="table-subtext">${esc(account.name)}${inactiveHint}</small>
        </td>
        <td>${paymentAmount}<small class="table-subtext">${frequencyHint}</small>
        </td>
        <td>${account.account_type === "rental" ? "—" : money(loanBalance)}</td>
      </tr>`;
    }

    function emptyPropertyRowHTML(property, street) {
      return `<tr>
        <td>
        <button type="button" class="button secondary compact" data-property-account="${esc(property.id)}">＋ Add account</button>
        </td>
        <td class="portfolio-due">—</td>${propertyAddressCell(property, street)}<td colspan="2" class="muted">No rental or contract recorded</td>
        <td>—</td>
        </tr>`;
    }

    function totalsRowHTML(totals) {
      const loanBalanceTotal = totals.loanCount
        ? money(totals.loanBalance)
        : "—";
      return `<tr>
        <td>
        </td>
        <td class="portfolio-due">
        <strong>${money(totals.unpaidDue)}</strong>
        </td>
        <td>
        </td>
        <td>
        <strong>Visible totals</strong>
        </td>
        <td>
        <strong>${money(totals.scheduledPayment)}<small class="table-subtext">per month</small>
        </strong>
        </td>
        <td>
        <strong>${loanBalanceTotal}</strong>
        </td>
        </tr>`;
    }

    return Object.freeze({
      accountRowHTML,
      emptyPropertyRowHTML,
      totalsRowHTML,
    });
  }

  window.PropertyDeskPropertyPortfolioTable = Object.freeze({ create });
})();
