/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  "use strict";

  const { splitEmailAddresses, isValidEmailAddress } =
    globalThis.PropertyDeskEmailAddressUtils;

  function paymentReminderMessage({
    address,
    subjectAddress = address,
    unpaidDue,
    senderName,
    recipientName,
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
    const body = [
      `Hello ${String(recipientName || "").trim() || "there"},`,
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

  function lateReminderMailto({
    email,
    address,
    subjectAddress,
    unpaidDue,
    senderName,
    recipientName,
    month,
    asOf,
  }) {
    const recipients = splitEmailAddresses(email)
      .filter(isValidEmailAddress)
      .map((value) => encodeURIComponent(value).replace(/%40/gi, "@"))
      .join(",");
    const message = paymentReminderMessage({
      address,
      subjectAddress,
      unpaidDue,
      senderName,
      recipientName,
      month,
      asOf,
    });
    return `mailto:${recipients}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
  }

  const helpers = Object.freeze({ paymentReminderMessage, lateReminderMailto });
  globalThis.PropertyDeskEmailUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
