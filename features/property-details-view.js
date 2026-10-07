/* Render the property modal without owning its data lookup or DOM actions. */
(() => {
  "use strict";

  function createPropertyDetailsView({
    money,
    esc,
    propertyDocumentsHTML,
    propertyAccountsHTML,
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
        <h3>Accounts at this property</h3>${propertyAccountsHTML(accounts)}</div>
        ${propertyDocumentsHTML(propertyDocs)}
        ${activityHTML}`;
    }

    return { propertyDetailsHTML };
  }

  window.PropertyDeskPropertyDetailsView = Object.freeze({
    create: createPropertyDetailsView,
  });
})();
