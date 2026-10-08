/* Build owner-only reminder preview content from current account terms. */
(() => {
  "use strict";

  function create({
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
      const name = account.party_name || "there";
      const subject = `Payment reminder for ${property.address} · ${label}`;
      const body = [
        `Hello ${name},`,
        "",
        `Our records show no rent or installment payment recorded for ${label}.`,
        "",
        `Unpaid due as of ${endDate}: ${money(amount)}`,
        `Property: ${address}`,
        "",
        "If you have already paid or believe this is incorrect, please contact your landlord or seller.",
        "",
        "Thank you,",
        "PropertyDesk",
      ].join("\n");

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
