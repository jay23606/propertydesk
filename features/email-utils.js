/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  "use strict";

  function create({ modules }) {
    const { splitEmailAddresses, isValidEmailAddress } =
      modules.emailAddressUtils;
    const paymentReminderMessage = modules.reminderCopy.buildReminderCopy;

    function fillTemplate(template, values) {
      return String(template || "").replace(
        /\{(name|amount|address|month|year|sender)\}/gi,
        (_, key) => String(values[key.toLowerCase()] || ""),
      );
    }

    function lateReminderMailto({
      email,
      address,
      subjectAddress,
      unpaidDue,
      recipientName,
      senderName,
      month,
      asOf,
      template,
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
      if (template) {
        message.subject = fillTemplate(template.subject || message.subject, {
          name: recipientName,
          amount: unpaidDue,
          address,
          month,
          year: String(month || "").match(/\d{4}/)?.[0],
          sender: senderName,
        });
        message.body = fillTemplate(template.body || message.body, {
          name: recipientName,
          amount: unpaidDue,
          address,
          month,
          year: String(month || "").match(/\d{4}/)?.[0],
          sender: senderName,
        });
      }
      return `mailto:${recipients}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
    }

    function lateReminderSms({ phone, template, ...messageOptions }) {
      const rawPhone = String(phone || "").trim();
      const digits = rawPhone.replace(/\D/g, "");
      if (!digits) return "";
      const internationalPrefix = rawPhone.startsWith("+") ? "+" : "";
      const message = paymentReminderMessage(messageOptions);
      const body = template
        ? fillTemplate(template.body || message.body, {
            name: messageOptions.recipientName,
            amount: messageOptions.unpaidDue,
            address: messageOptions.address,
            month: messageOptions.month,
            year: String(messageOptions.month || "").match(/\d{4}/)?.[0],
            sender: messageOptions.senderName,
          })
        : message.body;
      return `sms:${internationalPrefix}${digits}?body=${encodeURIComponent(body)}`;
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
