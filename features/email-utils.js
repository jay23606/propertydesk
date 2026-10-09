/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  "use strict";

  function create({ modules }) {
    const { splitEmailAddresses, isValidEmailAddress } =
      modules.emailAddressUtils;
    const paymentReminderMessage = modules.reminderCopy.buildReminderCopy;

    function lateReminderMailto({
      email,
      address,
      subjectAddress,
      unpaidDue,
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
        recipientName,
        month,
        asOf,
      });
      return `mailto:${recipients}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
    }

    function lateReminderSms({ phone, ...messageOptions }) {
      const rawPhone = String(phone || "").trim();
      const digits = rawPhone.replace(/\D/g, "");
      if (!digits) return "";
      const internationalPrefix = rawPhone.startsWith("+") ? "+" : "";
      const message = paymentReminderMessage(messageOptions);
      return `sms:${internationalPrefix}${digits}?body=${encodeURIComponent(message.body)}`;
    }

    return Object.freeze({
      paymentReminderMessage,
      lateReminderMailto,
      lateReminderSms,
    });
  }

  const api = Object.freeze({ create });
  globalThis.PropertyDeskEmailUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
