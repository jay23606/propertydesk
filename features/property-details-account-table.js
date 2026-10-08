/* Render the accounts section inside the property details modal. */
(() => {
  "use strict";

  function createPropertyDetailsAccountTable({
    money,
    esc,
    prettyType,
    paymentFrequencyLabel,
    accountBalance,
  }) {
    function propertyAccountsHTML(accounts) {
      if (!accounts.length)
        return '<p class="list-empty">No accounts yet. Add a rental, land contract, or private note.</p>';

      return `<div class="table-wrap property-detail-table property-account-table">
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
        <tbody>${accounts
          .map(
            (account) => `<tr>
        <td>
        <button type="button" class="table-action account-edit-link" data-edit-account="${esc(account.id)}" aria-label="Edit ${esc(account.name)}">${esc(account.name)}</button>
        <br>
        <span class="kind-pill">${esc(prettyType(account.account_type))}</span>
        </td>
        <td>
        <button type="button" class="table-action account-edit-link" data-edit-account="${esc(account.id)}" aria-label="Edit account for ${esc(account.party_name || account.name)}">${esc(account.party_name || "—")}</button>
        </td>
        <td>${money(account.payment_amount)} / ${esc(paymentFrequencyLabel(account.payment_frequency).toLowerCase())}</td>
        <td>${account.account_type === "rental" ? "—" : money(accountBalance(account))}</td>
        <td>
        <button class="table-action" data-detail="${esc(account.id)}">Open</button>
        </td>
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`;
    }

    return Object.freeze({ propertyAccountsHTML });
  }

  window.PropertyDeskPropertyDetailsAccountTable = Object.freeze({
    create: createPropertyDetailsAccountTable,
  });
})();
