/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  'use strict';

  function lateReminderMailto({ email, address, unpaidDue, senderName }) {
    const recipients = String(email || '')
      .split(/[;,]/)
      .map(value => value.trim())
      .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      .map(value => encodeURIComponent(value).replace(/%40/gi, '@'))
      .join(',');
    const subject = `Late Reminder for ${address}`;
    const body = `Unpaid due is ${unpaidDue} for ${address}\n\nThank you!\n${senderName || 'PropertyDesk'}`;
    return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const helpers = Object.freeze({ lateReminderMailto });
  globalThis.PropertyDeskEmailUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
