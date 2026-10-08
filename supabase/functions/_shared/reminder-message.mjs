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
  const { subject, body: text } = buildReminderCopy({
    subjectAddress: property.address,
    address,
    unpaidDue: `$${amountDue.toFixed(2)}`,
    recipientName: name,
    month: label,
  });
  const html = text
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
  return { subject, text, html };
}
