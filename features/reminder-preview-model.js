/* Build owner-only reminder preview content from current account terms. */
(() => {
  "use strict";

  function create({
    paymentReminderMessage,
    amountDueSince,
    unpaidDueAccrualStart,
    monthEnd,
    dateOnly,
    monthStart,
    propertyAddress,
    money,
  }) {
    function build({ property, account, recipients, payments }) {
      const endDate = monthEnd();
      const amount = amountDueSince(
        [account],
        payments,
        unpaidDueAccrualStart(),
        endDate,
      );
      const label = dateOnly(monthStart()).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const address = propertyAddress(property);
      const { subject, body } = paymentReminderMessage({
        address,
        subjectAddress: property.address,
        unpaidDue: money(amount),
        recipientName: account.party_name,
        senderName: "PropertyDesk",
        month: label,
        asOf: endDate,
      });

      return {
        recipients,
        subject,
        label,
        schedule: `Last day of ${label}, only when no rent or installment payment is recorded that month`,
        body,
      };
    }

    return Object.freeze({ build });
  }

  window.PropertyDeskReminderPreviewModel = Object.freeze({ create });
})();
