/* PropertyDesk owner-only buyer and tenant reminder preview. */
(() => {
  "use strict";

  function create({
    $, state, amountDueSince, unpaidDueAccrualStart, todayIso, monthEnd,
    moneyInput, toast, dateOnly, monthStart, propertyAddress, money, esc,
    openModal,
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
      const recipients = $("account-party-email").value
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean);
      const amount = amountDueSince(
        [account],
        state.payments,
        unpaidDueAccrualStart(),
        monthEnd(),
      );
      const label = dateOnly(monthStart()).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const address = propertyAddress(property);
      const name = account.party_name || "there";
      const subject = `Payment reminder for ${property.address} · ${label}`;
      const body = [
        `Hello ${name},`,
        "",
        `Our records show no rent or installment payment recorded for ${label}.`,
        "",
        `Unpaid due as of ${monthEnd()}: ${money(amount)}`,
        `Property: ${address}`,
        "",
        "If you have already paid or believe this is incorrect, please contact your landlord or seller.",
        "",
        "Thank you,",
        "PropertyDesk",
      ].join("\n");
      $("reminder-preview-content").innerHTML = `
        <div class="reminder-preview-meta">
          <div><small>To</small><strong>${esc(recipients.join(", ") || "No recipient email saved")}</strong></div>
          <div><small>Subject</small><strong>${esc(subject)}</strong></div>
          <div><small>Schedule</small><strong>Last day of ${esc(label)}, only when no rent or installment payment is recorded that month</strong></div>
        </div>
        <div class="reminder-preview-body">${esc(body).replaceAll("\n", "<br>")}</div>
        <p class="field-hint">Preview only. No email is sent from this window. Each saved address receives an individual copy. Estimated loan balance is not included.</p>`;
      openModal("reminder-preview-modal");
    }

    return { previewReminderEmail };
  }

  window.PropertyDeskReminderPreview = { create };
})();
