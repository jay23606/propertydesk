/* Render prior agreement terms and mapped audit events for an account. */
(() => {
  "use strict";

  function createAccountHistoryView({ esc, money, fmtDate, fmtDateTime }) {
    function accountHistoryHTML({ accountVersions, auditEvents, auditError }) {
      const versionsHTML = `<div class="detail-section">
        <h3>Prior agreement terms</h3>${
          accountVersions.length
            ? `<div class="audit-list">${accountVersions
                .map((version) => {
                  const terms = version.terms || {};
                  return `<div class="audit-row">
        <div>
        <strong>${esc(version.reason || "Terms updated")}</strong>
        <small>${fmtDate(version.effective_from)} – ${fmtDate(version.replaced_on)} · ${money(terms.payment_amount)} scheduled · ${money(terms.original_principal)} principal · ${Number(terms.interest_rate || 0)}% · ${Number(terms.term_months || 0)} months</small>${terms.party_name ? `<small>${esc(terms.party_name)}</small>` : ""}</div>
        <time datetime="${esc(version.created_at)}">${fmtDate(String(version.created_at || "").slice(0, 10))}</time>
        </div>`;
                })
                .join("")}</div>`
            : '<p class="list-empty">Amendments and prior terms will appear here when recorded.</p>'
        }</div>`;
      const auditHTML = `<div class="detail-section">
        <h3>Change history</h3>
        <p class="field-hint">Latest account and payment events. Original entries remain available after a void.</p>${
          auditEvents.length
            ? `<div class="audit-list">${auditEvents
                .map(
                  (event) => `<div class="audit-row">
        <div>
        <strong>${event.action} ${event.target}</strong>${event.reason ? `<small>Reason: ${esc(event.reason)}</small>` : ""}</div>
        <time datetime="${esc(event.created_at)}">${esc(fmtDateTime(event.created_at))}</time>
        </div>`,
                )
                .join("")}</div>`
            : auditError
              ? '<p class="list-empty">Change history is temporarily unavailable.</p>'
              : '<p class="list-empty">No changes recorded yet.</p>'
        }</div>`;

      return versionsHTML + auditHTML;
    }

    return Object.freeze({ accountHistoryHTML });
  }

  window.PropertyDeskAccountHistoryView = Object.freeze({
    create: createAccountHistoryView,
  });
})();
