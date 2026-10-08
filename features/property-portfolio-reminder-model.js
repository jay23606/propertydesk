/* Build manual late-reminder details for one Properties grid account row. */
(() => {
  "use strict";

  function createPropertyPortfolioReminderModel({
    state,
    propertyAddress,
    monthStart,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    lateReminderSms,
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
        senderName:
          state.user?.user_metadata?.display_name?.trim() || "PropertyDesk",
        recipientName: partyName,
        month: dateOnly(monthStart()).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        asOf: monthEnd(),
      };
      const reminderHref = lateReminderMailto(reminderDetails);
      const textReminderHref = lateReminderSms(reminderDetails);
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
