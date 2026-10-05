/* Property-level portfolio details and actions. */
(() => {
  "use strict";

  function createPropertyDetails(context) {
    const {
      $, state, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, openModal, closeModal,
      editAccount, openPayment, openExpense, resetAccountForm, populateFormOptions,
      propertyAddress, renderPropertyActivity,
    } = context;

    function openPropertyDetails(id) {
      state.auditRequestId++;
      const property = state.properties.find((x) => x.id === id);
      if (!property) return;
      state.selectedPropertyId = id;
      const accounts = state.accounts.filter((account) => account.property_id === id);
      const { incomeTotal, expenseTotal, html: activityHTML } =
        renderPropertyActivity(id, accounts);
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
        <div class="holder-choices">${state.workspaceMembers
          .map(
            (m) => `<label>
        <input type="checkbox" data-holder-choice value="${esc(m.member_user_id)}" ${state.propertyHolders.some((h) => h.property_id === id && h.member_user_id === m.member_user_id) ? "checked" : ""}> ${esc(m.display_name || m.email)}</label>`,
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
            (a) => `<tr>
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
        </tr>`,
          )
          .join("")}</tbody>
        </table>
        </div>`
            : '<p class="list-empty">No accounts yet. Add a rental, land contract, or private note.</p>'
        }</div>
        <div class="detail-section">
        <h3>Agreements and documents</h3>
        <p class="field-hint">Files are private to your workspace. Select an agreement name to open or download it in your browser. PDFs, DOCX, and JPEG agreements up to 15 MB are supported.</p>
        <label class="button secondary file-button">↑ Upload agreement<input type="file" data-property-document accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg">
        </label>
        <div class="document-list">${
          propertyDocs.length
            ? propertyDocs
                .map(
                  (doc) => `<div class="document-row">
        <span>▤</span>
        <div>
        <a class="document-name-link" href="#" data-open-document="${esc(doc.id)}">${esc(doc.file_name)}</a>
        <small>${esc(doc.content_type || "Document")} · ${fmtDate(String(doc.created_at || "").slice(0, 10))}</small>
        </div>
        <button type="button" class="button secondary compact document-delete" data-delete-document="${esc(doc.id)}" aria-label="Delete ${esc(doc.file_name)}">Delete</button>
        </div>`,
                )
                .join("")
            : '<p class="list-empty">No agreement files attached yet.</p>'
        }</div>
        </div>
        ${activityHTML}`;
      $("property-archive-toggle").textContent = property.archived_at
        ? "Restore property"
        : "Archive property";
      openModal("property-detail-modal");
    }

    function attachPropertyEvents(toggleArchiveProperty) {
      $("property-detail-content").addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-account]");
        if (!button) return;
        const account = state.accounts.find(
          (item) => item.id === button.dataset.editAccount,
        );
        if (!account) return;
        event.preventDefault();
        closeModal($("property-detail-modal"));
        editAccount(account);
      });

      $("property-detail-add-income").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        openPayment(null, propertyId);
      });
      $("property-detail-add-expense").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        openExpense(propertyId);
      });
      $("property-detail-add-account").addEventListener("click", () => {
        const propertyId = state.selectedPropertyId;
        if (!propertyId) return;
        closeModal($("property-detail-modal"));
        resetAccountForm();
        populateFormOptions();
        $("account-property").value = propertyId;
        openModal("account-modal");
      });
      $("property-archive-toggle").addEventListener(
        "click",
        toggleArchiveProperty,
      );
    }

    return { openPropertyDetails, attachPropertyEvents };
  }

  window.PropertyDeskPropertyDetails = Object.freeze({ create: createPropertyDetails });
})();
