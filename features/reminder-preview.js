/* PropertyDesk owner-only buyer and tenant reminder preview. */
(() => {
  "use strict";

  const { splitEmailAddresses } = window.PropertyDeskEmailAddressUtils;

  function create({
    $,
    state,
    todayIso,
    moneyInput,
    toast,
    esc,
    openModal,
    model: previewModel,
  }) {
    function previewReminderEmail() {
      const property = state.properties.find(
        (item) => item.id === $("account-property").value,
      );
      if (!property) {
        toast("Choose a property to preview its reminder");
        return;
      }
      const account = {
        id: $("account-id").value || "preview",
        property_id: property.id,
        account_type: $("account-type").value,
        name: $("account-name").value.trim() || "Account",
        party_name: $("account-party").value.trim() || null,
        start_date: $("account-start").value || todayIso(),
        next_due_date: $("account-next-due").value || null,
        payment_amount: moneyInput($("account-payment").value),
        payment_frequency: $("account-frequency").value,
        status: "active",
      };
      const recipients = splitEmailAddresses($("account-party-email").value);
      const preview = previewModel.build({
        property,
        account,
        recipients,
        payments: state.payments,
      });
      $("reminder-preview-content").innerHTML = `
        <div class="reminder-preview-meta">
          <div><small>To</small><strong>${esc(preview.recipients.join(", ") || "No recipient email saved")}</strong></div>
          <div><small>Subject</small><strong>${esc(preview.subject)}</strong></div>
          <div><small>Schedule</small><strong>${esc(preview.schedule)}</strong></div>
        </div>
        <div class="reminder-preview-body">${esc(preview.body).replaceAll("\n", "<br>")}</div>
        <p class="field-hint">Preview only. No email is sent from this window. Each saved address receives an individual copy. Estimated loan balance is not included.</p>`;
      openModal("reminder-preview-modal");
    }

    return Object.freeze({ previewReminderEmail });
  }

  window.PropertyDeskReminderPreview = Object.freeze({ create });
})();
