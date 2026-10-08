/* Build the plain-text message shared by browser reminders and email delivery. */
(() => {
  "use strict";

  function buildReminderCopy({
    address,
    subjectAddress = address,
    unpaidDue,
    recipientName,
    senderName,
    month,
    asOf,
  }) {
    const period =
      month ||
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date());
    const amountDate = asOf || new Date().toISOString().slice(0, 10);
    const subject = `Payment reminder for ${subjectAddress} · ${period}`;
    const name = String(recipientName || "").trim() || "there";
    const body = [
      `Hello ${name},`,
      "",
      `Our records show no rent or installment payment recorded for ${period}.`,
      "",
      `Unpaid due as of ${amountDate}: ${unpaidDue}`,
      `Property: ${address}`,
      "",
      "If you have already paid or believe this is incorrect, please contact your landlord or seller.",
      "",
      "Thank you,",
      senderName || "PropertyDesk",
    ].join("\n");

    return { subject, body };
  }

  const helpers = Object.freeze({ buildReminderCopy });
  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskReminderCopy = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
