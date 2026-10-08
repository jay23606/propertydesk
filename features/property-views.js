/* PropertyDesk portfolio views. */
(() => {
  "use strict";

  function createPropertyViews({
    $,
    state,
    esc,
    portfolioTable,
    portfolioModel,
  }) {
    function attachEvents() {
      $("property-search").addEventListener("input", renderProperties);
      $("property-filter").addEventListener("change", renderProperties);
      $("property-holder-filter").addEventListener("change", renderProperties);
      $("show-archived").addEventListener("change", renderProperties);
    }
    function renderProperties() {
      const holder = $("property-holder-filter"),
        current = holder.value;
      holder.innerHTML =
        '<option value="all">All account holders</option>' +
        state.workspaceMembers
          .map(
            (m) =>
              `<option value="${esc(m.member_user_id)}">${esc(m.display_name || m.email)}</option>`,
          )
          .join("");
      holder.value = state.workspaceMembers.some(
        (m) => m.member_user_id === current,
      )
        ? current
        : "all";
      renderPropertyRows();
      $("property-nav-count").textContent = state.properties.filter(
        (p) => !p.archived_at,
      ).length;
    }
    function renderPropertyRows() {
      const rows = portfolioModel.buildRows({
        query: $("property-search").value.trim().toLowerCase(),
        type: $("property-filter").value,
        holderId: $("property-holder-filter").value,
        showArchived: $("show-archived").checked,
      });
      $("properties-table").innerHTML = rows
        .map((row) =>
          row.hasAccount
            ? portfolioTable.accountRowHTML({
                property: row.property,
                account: row.accountRecord,
                street: row.street,
                due: row.unpaidDue,
                monthly: row.scheduledPayment,
                loanBalance: row.loanBalance,
                partyName: row.partyName,
                accountId: row.id,
                paymentStatus: row.paymentStatus,
                reminderHref: row.reminderHref,
                textReminderHref: row.textReminderHref,
                hasEmail: Boolean(row.accountRecord.party_email),
                emailHint: row.accountRecord.party_email
                  ? "Draft late reminder email"
                  : "No email saved",
                textHint: row.textReminderHref
                  ? "Open a text reminder draft"
                  : "No phone saved",
              })
            : portfolioTable.emptyPropertyRowHTML(row.property, row.street),
        )
        .join("");
      const totals = portfolioModel.totalsFor(rows);
      $("properties-totals").innerHTML = portfolioTable.totalsRowHTML(totals);
      $("properties-totals").classList.toggle(
        "hidden",
        !rows.some((row) => row.hasAccount),
      );
      $("properties-empty").classList.toggle("hidden", rows.length > 0);
      if (!rows.length)
        $("properties-empty").textContent =
          "No matching active properties. Use “Show inactive / archived” to include inactive records.";
    }

    return Object.freeze({
      renderProperties,
      attachEvents,
    });
  }

  window.PropertyDeskPropertyViews = Object.freeze({
    create: createPropertyViews,
  });
})();
