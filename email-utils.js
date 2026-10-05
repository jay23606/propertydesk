/* Small email-link helpers shared by PropertyDesk and its tests. */
(() => {
  'use strict';

  function lateReminderMailto({
    email,
    address,
    unpaidDue,
    senderName,
    recipientName,
    month,
    asOf,
  }) {
    const recipients = String(email || '')
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      .map((value) => encodeURIComponent(value).replace(/%40/gi, '@'))
      .join(',');
    const period =
      month ||
      new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    const amountDate = asOf || new Date().toISOString().slice(0, 10);
    const subject = `Payment reminder for ${address} · ${period}`;
    const body = [
      `Hello ${recipientName || 'there'},`,
      '',
      `Our records show no rent or installment payment recorded for ${period}.`,
      '',
      `Unpaid due as of ${amountDate}: ${unpaidDue}`,
      `Property: ${address}`,
      '',
      'If you have already paid or believe this is incorrect, please contact your landlord or seller.',
      '',
      'Thank you,',
      senderName || 'PropertyDesk',
    ].join('\n');
    return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const helpers = Object.freeze({ lateReminderMailto });
  globalThis.PropertyDeskEmailUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
