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
  const subject = `Payment reminder for ${property.address} · ${label}`;
  const name = account.party_name?.trim() || "there";
  const sender = "PropertyDesk";
  const text = `Hello ${name},\n\nOur records show no rent or installment payment recorded for ${label}.\n\nUnpaid due as of ${monthEnd}: $${amountDue.toFixed(2)}\nProperty: ${address}\n\nIf you have already paid or believe this is incorrect, please contact your landlord or seller.\n\nThank you,\n${sender}`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Our records show no rent or installment payment recorded for ${escapeHtml(label)}.</p><p><strong>Unpaid due as of ${escapeHtml(monthEnd)}:</strong> $${amountDue.toFixed(2)}<br><strong>Property:</strong> ${escapeHtml(address)}</p><p>If you have already paid or believe this is incorrect, please contact your landlord or seller.</p><p>Thank you,<br>${sender}</p>`;
  return { subject, text, html };
}
