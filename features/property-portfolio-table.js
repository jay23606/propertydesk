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
  const EMAIL_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM4 6l8 6 8-6"/></svg>';
  const SMS_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.5a2.5 2.5 0 0 1-1-2z"/><path d="M8 9h8M8 12h5"/></svg>';

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
      accountId,
      paymentStatus,
      reminderHref,
      textReminderHref,
      hasEmail,
      emailHint,
      textHint,
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
        <td class="portfolio-contact-action">${hasEmail ? `<a class="portfolio-icon-action" href="${esc(reminderHref)}" title="${esc(emailHint)}" aria-label="${esc(`Draft late reminder email for ${partyName}`)}">${EMAIL_ICON}</a>` : `<span class="portfolio-icon-action unavailable" title="${esc(emailHint)}" aria-label="${esc(emailHint)}">${EMAIL_ICON}</span>`}</td>
        <td class="portfolio-contact-action">${textReminderHref ? `<a class="portfolio-icon-action" href="${esc(textReminderHref)}" title="${esc(textHint)}" aria-label="${esc(`Draft text reminder for ${partyName}`)}">${SMS_ICON}</a>` : `<span class="portfolio-icon-action unavailable" title="${esc(textHint)}" aria-label="${esc(textHint)}">${SMS_ICON}</span>`}</td>
        <td>
        <button type="button" class="table-action property-party-name" data-account-edit="${esc(accountId)}" aria-label="Edit account for ${esc(partyName)}">${esc(partyName)}</button>
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
        <td class="portfolio-due">—</td>${propertyAddressCell(property, street)}<td></td><td></td><td colspan="2" class="muted">No rental or contract recorded</td>
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
        <td></td>
        <td></td>
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
