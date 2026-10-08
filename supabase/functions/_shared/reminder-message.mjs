import "./reminder-copy.js";

const { buildReminderCopy } = globalThis.PropertyDeskReminderCopy;

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

export function reminderMessage(
  account,
  property,
  monthStart,
  monthEnd,
  amountDue,
) {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T00:00:00Z`));
  const address = [
    property.address,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
  const name = account.party_name?.trim() || "there";
  const sender = "PropertyDesk";
  const { subject, body: text } = buildReminderCopy({
    subjectAddress: property.address,
    address,
    unpaidDue: `$${amountDue.toFixed(2)}`,
    recipientName: name,
    senderName: sender,
    month: label,
    asOf: monthEnd,
  });
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Our records show no rent or installment payment recorded for ${escapeHtml(label)}.</p><p><strong>Unpaid due as of ${escapeHtml(monthEnd)}:</strong> $${amountDue.toFixed(2)}<br><strong>Property:</strong> ${escapeHtml(address)}</p><p>If you have already paid or believe this is incorrect, please contact your landlord or seller.</p><p>Thank you,<br>${sender}</p>`;
  return { subject, text, html };
}
