/* Build the plain-text message shared by browser reminders and email delivery. */
(() => {
  "use strict";

  function buildReminderCopy({
    address,
    subjectAddress = address,
    unpaidDue,
    recipientName,
    month,
  }) {
    const period =
      month ||
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date());
    const subject = `Payment reminder for ${subjectAddress} · ${period}`;
    const name = String(recipientName || "").trim() || "there";
    const body = `Hello ${name}, our records show ${unpaidDue} unpaid for ${period} at ${address}. Please arrange payment promptly, or contact me if you believe our records are incorrect.`;

    return { subject, body };
  }

  const helpers = Object.freeze({ buildReminderCopy });
  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskReminderCopy = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
