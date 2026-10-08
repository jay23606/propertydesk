/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  "use strict";

  const { splitEmailAddresses, isValidEmailAddress } =
    globalThis.PropertyDeskEmailAddressUtils;

  const paymentReminderMessage =
    globalThis.PropertyDeskReminderCopy.buildReminderCopy;

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
