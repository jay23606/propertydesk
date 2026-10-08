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
  }) {
    const period =
      month ||
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date());
    const subject = `Payment reminder for ${subjectAddress} · ${period}`;
    const name = String(recipientName || "").trim() || "there";
    const sender = String(senderName || "").trim();
    const body = [
      `Hi ${name},`,
      "",
      `Our records show ${unpaidDue} unpaid for ${address} (tracked since October 2026; earlier balances may not be included).`,
      "",
      "Please arrange payment promptly or contact me with questions.",
      "",
      "Thanks!",
      ...(sender ? [sender] : []),
    ].join("\n");

    return { subject, body };
  }

  const helpers = Object.freeze({ buildReminderCopy });
  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskReminderCopy = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
