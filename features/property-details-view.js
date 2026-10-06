/* Render the property modal without owning its data lookup or DOM actions. */
(() => {
  "use strict";

  function createPropertyDetailsView({
    money,
    esc,
    prettyType,
    paymentFrequencyLabel,
    accountBalance,
    propertyDocumentsHTML,
  }) {
    function propertyDetailsHTML({
      property,
      accounts,
      propertyDocs,
      workspaceMembers,
      propertyHolders,
      incomeTotal,
      expenseTotal,
      activityHTML,
    }) {
      return `<div class="detail-kpis property-detail-kpis">
        <div class="detail-kpi">
        <small>Accounts</small>
        <strong>${accounts.filter((account) => account.status === "active").length} active</strong>
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
        <div class="holder-choices">${workspaceMembers
          .map(
            (member) => `<label>
        <input type="checkbox" data-holder-choice value="${esc(member.member_user_id)}" ${propertyHolders.some((holder) => holder.property_id === property.id && holder.member_user_id === member.member_user_id) ? "checked" : ""}> ${esc(member.display_name || member.email)}</label>`,
          )
          .join("")}</div>
        <button class="button secondary compact" type="button" data-save-holders>Save labels</button>
        </div>
        <div class="detail-section">
        <h3>Accounts at this property</h3>${
          accounts.length
            ? `<div class="table-wrap property-detail-table property-account-table">
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
        </div>`
            : '<p class="list-empty">No accounts yet. Add a rental, land contract, or private note.</p>'
        }</div>
        ${propertyDocumentsHTML(propertyDocs)}
        ${activityHTML}`;
    }

    return { propertyDetailsHTML };
  }

  window.PropertyDeskPropertyDetailsView = Object.freeze({
    create: createPropertyDetailsView,
  });
})();
