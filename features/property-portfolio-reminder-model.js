/* Build manual late-reminder details for one Properties grid account row. */
(() => {
  "use strict";

  function createPropertyPortfolioReminderModel({
    getSenderName = () => "PropertyDesk",
    propertyAddress,
    monthStart,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    lateReminderSms,
    getEmailTemplate = () => null,
    getSmsTemplate = () => null,
    money,
  }) {
    function buildReminderDetails(property, account, unpaidDue) {
      const partyName = account.party_name || account.name;
      const reminderDetails = {
        email: account.party_email,
        phone: account.party_phone,
        address: propertyAddress(property),
        subjectAddress: property.address,
        unpaidDue: money(unpaidDue),
        senderName: getSenderName(),
        recipientName: partyName,
        month: dateOnly(monthStart()).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        asOf: monthEnd(),
      };
      const reminderHref = lateReminderMailto({
        ...reminderDetails,
        template: getEmailTemplate(),
      });
      const textReminderHref = lateReminderSms({
        ...reminderDetails,
        template: getSmsTemplate(),
      });
      const recipientHint = account.party_email
        ? "Draft late reminder email"
        : "No email saved; opens an unaddressed late reminder draft";

      return { reminderHref, textReminderHref, recipientHint };
    }

    return Object.freeze({ buildReminderDetails });
  }

  window.PropertyDeskPropertyPortfolioReminderModel = Object.freeze({
    create: createPropertyPortfolioReminderModel,
  });
})();
