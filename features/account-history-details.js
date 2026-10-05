/* Load and render agreement-term and audit history within account details. */
(() => {
  "use strict";

  function createAccountHistoryDetails({ state, esc, money, fmtDate }) {
    async function renderAccountHistory(account, payments) {
      const auditIds = [
        account.id,
        ...payments.slice(0, 50).map((payment) => payment.id),
      ];
      let history = [];
      let auditError = false;
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

      const accountVersions = state.agreementVersions.filter(
        (version) => version.account_id === account.id,
      );
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
          history.length
            ? `<div class="audit-list">${history
                .map((event) => {
                  const target =
                      event.entity_type === "pd_accounts"
                        ? "Account"
                        : "Payment",
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
      return versionsHTML + auditHTML;
    }

    return { renderAccountHistory };
  }

  window.PropertyDeskAccountHistoryDetails = Object.freeze({
    create: createAccountHistoryDetails,
  });
})();
